import type { Diagram } from './diagram';
import type { WalkCall, WalkChoice, WalkState, WalkthroughEngine } from './walkthrough';

/**
 * Escenarios: los caminos posibles de un proceso, sacados de su propio
 * recorrido paso a paso (sirve para cualquier tipo de diagrama con motor).
 *
 * - Un escenario es la lista de elecciones de un camino que termina.
 * - En cada decisión se abre un escenario por salida; en cada subproceso, uno
 *   por cada resultado con que puede terminar (o uno sin entrar, si no tiene).
 * - Si una decisión ya tiene salida coherente (p. ej. por el resultado del
 *   subproceso anterior), solo se sigue esa: lo contradictorio no es un escenario.
 * - Bucles: en un mismo camino cada salida se elige una sola vez; así una
 *   vuelta atrás se recorre una vez y el camino sigue por otra salida.
 * - Topes: MAX_SCENARIOS caminos y MAX_STEPS pasos por camino (se avisa).
 */

const MAX_STEPS = 500;
export const MAX_SCENARIOS = 40;

/** Cómo puede terminar el subproceso de una llamada; null si no se sabe (se sigue sin entrar). */
export type CallOutcomes = (call: WalkCall) => { diagramName: string; outcomes: string[] } | null;

export interface Scenario {
  key: string;
  choices: WalkChoice[];
  /** El estado al terminar: registro, cobertura, resultado. */
  final: WalkState;
}

/** Una salida posible de un punto de decisión, para medir cobertura. */
export interface Branch {
  key: string;
  nodeId: string;
  label: string;
}

export const choiceItemKey = (choice: WalkChoice): string =>
  'edgeId' in choice ? `${choice.nodeId}>${choice.edgeId}` : `${choice.nodeId}=${choice.outcome ?? ''}`;

export const scenarioKey = (choices: readonly WalkChoice[]): string => choices.map(choiceItemKey).join('|');

function runToStop(engine: WalkthroughEngine, diagram: Diagram, state: WalkState): WalkState {
  let current = state;
  for (let count = 0; count < MAX_STEPS && current.status === 'running'; count += 1) current = engine.step(diagram, current);
  return current;
}

/** Sale de un subproceso con `outcome` (o sin entrar, si es null). */
function resolveCall(engine: WalkthroughEngine, diagram: Diagram, state: WalkState, outcome: string | null, diagramName: string): WalkState {
  if (!engine.resumeCall) return state;
  return outcome === null
    ? engine.resumeCall(diagram, state, 'skipped')
    : engine.resumeCall(diagram, state, 'returned', { outcome: { label: outcome, from: 'final', diagramName }, facts: state.facts });
}

/** Todos los caminos que terminan, en orden de aparición, y las salidas posibles en cada punto. */
export function enumerateScenarios(engine: WalkthroughEngine, diagram: Diagram, outcomesOf: CallOutcomes): { scenarios: Scenario[]; branches: Branch[]; truncated: boolean } {
  const scenarios: Scenario[] = [];
  const branches = new Map<string, Branch>();
  const stack: WalkState[] = [runToStop(engine, diagram, engine.start(diagram))];
  let truncated = false;
  while (stack.length > 0) {
    if (scenarios.length >= MAX_SCENARIOS) {
      truncated = true;
      break;
    }
    const state = stack.pop()!;
    const used = new Set(state.choices.map(choiceItemKey));
    if (state.status === 'choice' && state.choice) {
      const { nodeId, suggested } = state.choice;
      // Con una salida coherente con lo ya decidido, las demás contradicen el camino: no son escenarios.
      const options = suggested ? state.choice.options.filter((option) => option.edgeId === suggested.edgeId) : state.choice.options;
      for (const option of options) {
        const key = choiceItemKey({ nodeId, edgeId: option.edgeId });
        if (!branches.has(key)) branches.set(key, { key, nodeId, label: option.label });
      }
      const open = options.filter((option) => !used.has(choiceItemKey({ nodeId, edgeId: option.edgeId })));
      // Al revés, para que la pila recorra las salidas en su orden.
      for (const option of [...open].reverse()) stack.push(runToStop(engine, diagram, engine.step(diagram, state, option.edgeId)));
    } else if (state.status === 'call' && state.call && engine.resumeCall) {
      const info = outcomesOf(state.call);
      const outcomes: (string | null)[] = info && info.outcomes.length > 0 ? info.outcomes : [null];
      const name = info?.diagramName ?? 'el subproceso';
      if (outcomes.length > 1) {
        for (const outcome of outcomes) {
          const key = choiceItemKey({ nodeId: state.call.nodeId, outcome });
          if (!branches.has(key)) branches.set(key, { key, nodeId: state.call.nodeId, label: `«${name}» termina en «${outcome}»` });
        }
      }
      for (const outcome of [...outcomes].reverse()) stack.push(runToStop(engine, diagram, resolveCall(engine, diagram, state, outcome, name)));
    } else {
      scenarios.push({ key: scenarioKey(state.choices), choices: state.choices, final: state });
    }
  }
  return { scenarios, branches: [...branches.values()], truncated };
}

/**
 * Repite un camino guardado paso a paso (para mostrarlo en el recorrido). Es
 * válido si cada elección sigue siendo posible donde corresponde y el camino
 * termina: si el diagrama cambió y ya no se puede, `valid` es false.
 */
export function replayScenario(engine: WalkthroughEngine, diagram: Diagram, choices: readonly WalkChoice[], outcomesOf: CallOutcomes): { states: WalkState[]; valid: boolean } {
  let state = engine.start(diagram);
  const states = [state];
  let index = 0;
  for (let count = 0; count < MAX_STEPS; count += 1) {
    if (state.status === 'running') {
      state = engine.step(diagram, state);
    } else if (state.status === 'choice' && state.choice) {
      const choice = choices[index];
      if (!choice || !('edgeId' in choice) || choice.nodeId !== state.choice.nodeId || !state.choice.options.some((option) => option.edgeId === choice.edgeId)) return { states, valid: false };
      state = engine.step(diagram, state, choice.edgeId);
      index += 1;
    } else if (state.status === 'call' && state.call) {
      const choice = choices[index];
      if (!choice || 'edgeId' in choice || choice.nodeId !== state.call.nodeId) return { states, valid: false };
      const info = outcomesOf(state.call);
      if (choice.outcome !== null && info && !info.outcomes.includes(choice.outcome)) return { states, valid: false };
      state = resolveCall(engine, diagram, state, choice.outcome, info?.diagramName ?? 'el subproceso');
      index += 1;
    } else {
      break;
    }
    states.push(state);
  }
  return { states, valid: index === choices.length && (state.status === 'finished' || state.status === 'stuck') };
}

/** Salidas que ningún camino de `covering` recorre. */
export function uncoveredBranches(branches: readonly Branch[], covering: readonly (readonly WalkChoice[])[]): Branch[] {
  const covered = new Set(covering.flatMap((choices) => choices.map(choiceItemKey)));
  return branches.filter((branch) => !covered.has(branch.key));
}
