import { faCheck, faChevronDown, faCopy, faEye, faFloppyDisk, faPlus, faRoute, faTrashCan, faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useMemo, useState } from 'react';
import {
  draftTestCase,
  enumerateScenarios,
  MAX_SCENARIOS,
  replayScenario,
  scenarioKey,
  scenarioTitle,
  TEST_STATUSES,
  uncoveredBranches,
  type CallOutcomes,
  type Diagram,
  type Scenario,
  type TestCase,
  type TestStatus,
  type WalkChoice,
  type WalkState,
  type WalkthroughEngine,
} from '@/core/model';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { diagramRegistry } from '@/core/registry';
import { useProjectStore } from '@/core/store/projectStore';
import { useHighlightStore } from '@/canvas/highlightStore';
import { copyTable, escapeHtml } from '@/ui/clipboard';
import { inputClass } from '@/ui/explanation/formFields';
import { useWalkthroughStore } from '@/ui/narration/walkthroughStore';
import { useProjectDiagrams } from '@/ui/projects/useProjectDiagrams';

const SCENARIO_PREFIX = 'scenario:';

const STATUS_STYLE: Record<TestStatus, string> = {
  pendiente: 'bg-raised text-ink-600',
  pasa: 'bg-success-soft text-success',
  falla: 'bg-danger-soft text-danger',
};
const STATUS_LABEL: Record<TestStatus, string> = { pendiente: 'Pendiente', pasa: 'Pasa', falla: 'Falla' };

/**
 * Cómo puede terminar el subproceso de una llamada: lee su diagrama (del
 * proyecto o, si no está, de lo guardado) y pregunta a su motor.
 */
export function useCallOutcomes(): CallOutcomes {
  const projectDiagrams = useProjectDiagrams();
  const repository = usePersistenceStore((state) => state.repository);
  return useCallback<CallOutcomes>((call) => {
    if (!call.diagramId) return null;
    const sub = projectDiagrams.find((diagram) => diagram.id === call.diagramId) ?? repository?.load(call.diagramId) ?? null;
    if (!sub) return null;
    const engine = diagramRegistry.has(sub.diagramType) ? diagramRegistry.get(sub.diagramType).walkthrough : undefined;
    return { diagramName: sub.name, outcomes: engine?.outcomes?.(sub) ?? [] };
  }, [projectDiagrams, repository]);
}

/**
 * Escenarios del proceso: todos sus caminos posibles (sacados del recorrido) y
 * los casos de prueba guardados, con cuántas ramas cubren. Cada camino se puede
 * ver en el lienzo, recorrer paso a paso o guardar como caso de prueba.
 */
export function ScenariosView({ engine, diagram, onWalk }: { engine: WalkthroughEngine; diagram: Diagram; onWalk: () => void }) {
  const outcomesOf = useCallOutcomes();
  const project = useProjectStore((state) => state.project);
  const setHighlight = useHighlightStore((state) => state.setHighlight);
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { scenarios, branches, truncated } = useMemo(() => enumerateScenarios(engine, diagram, outcomesOf), [engine, diagram, outcomesOf]);
  const allCases = project?.testCases;
  const testCases = useMemo(() => (allCases ?? []).filter((item) => item.diagramId === diagram.id), [allCases, diagram.id]);
  const inProject = project?.diagramIds.includes(diagram.id) ?? false;
  const savedByKey = useMemo(() => new Map(testCases.map((item) => [scenarioKey(item.choices), item])), [testCases]);
  const stale = useMemo(() => new Set(testCases.filter((item) => !replayScenario(engine, diagram, item.choices, outcomesOf).valid).map((item) => item.id)), [testCases, engine, diagram, outcomesOf]);
  const uncovered = uncoveredBranches(branches, testCases.filter((item) => !stale.has(item.id)).map((item) => item.choices));
  const covered = branches.length - uncovered.length;

  function show(key: string, nodeIds: string[], edgeIds: string[]) {
    setHighlight({ sourceKey: `${SCENARIO_PREFIX}${key}`, tone: 'focus', nodeIds, edgeIds });
  }
  function showCase(item: TestCase) {
    const final = replayScenario(engine, diagram, item.choices, outcomesOf).states.at(-1)!;
    show(item.id, final.visitedNodeIds, final.visitedEdgeIds);
  }
  /** Carga el camino en el recorrido paso a paso, con todo su historial, y lo abre. */
  function walk(choices: readonly WalkChoice[]) {
    const { states } = replayScenario(engine, diagram, choices, outcomesOf);
    const walkthrough = useWalkthroughStore.getState();
    walkthrough.start(diagram, states[0]!);
    for (const state of states.slice(1)) walkthrough.push(state);
    onWalk();
  }
  function save(scenario: Scenario) {
    const id = useProjectStore.getState().addTestCase({ diagramId: diagram.id, choices: scenario.choices, ...draftTestCase(diagram, scenario.choices, scenario.final) });
    if (id) setOpenId(id);
  }

  async function copyCases() {
    const requirementCodes = (item: TestCase) => item.requirementIds.map((id) => project?.requirements.find((requirement) => requirement.id === id)?.code).filter(Boolean).join(', ');
    const rows = testCases.map((item) => [item.code, item.title, item.given, item.when, item.then, requirementCodes(item), STATUS_LABEL[item.status]]);
    const head = ['Código', 'Caso de prueba', 'Dado', 'Cuando', 'Entonces', 'Verifica', 'Estado'];
    const cell = (text: string) => escapeHtml(text).replace(/\n/g, '<br>');
    const html = `<table border="1" cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:11pt"><tr>${head.map((title) => `<th style="background:#d9d9d9">${title}</th>`).join('')}</tr>${rows.map((row) => `<tr>${row.map((value) => `<td>${cell(value)}</td>`).join('')}</tr>`).join('')}</table>`;
    if (await copyTable(html, [head, ...rows].map((row) => row.map((value) => value.replace(/\n/g, ' / ')).join('\t')).join('\n'))) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {branches.length > 0 && (
        <section aria-label="Cobertura de los casos de prueba" className="shrink-0 border-b border-line px-4 py-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-xs font-semibold text-ink-900">Ramas cubiertas</h3>
            <span className={`ml-auto text-xs font-semibold tabular-nums ${uncovered.length === 0 ? 'text-success' : 'text-ink-600'}`}>{covered} de {branches.length}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuemin={0} aria-valuemax={branches.length} aria-valuenow={covered}>
            <div className={`h-full rounded-full ${uncovered.length === 0 ? 'bg-success' : 'bg-accent'}`} style={{ width: `${(covered / branches.length) * 100}%` }} />
          </div>
          {uncovered.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {uncovered.map((branch) => (
                <li key={branch.key}>
                  <button type="button" onClick={() => show(branch.key, [branch.nodeId], [])} className="w-full rounded px-1 py-0.5 text-left text-[11px] text-ink-600 hover:bg-canvas hover:text-ink-900">
                    Sin probar: {branch.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-label="Casos de prueba" className="shrink-0 border-b border-line px-3 py-3">
        <div className="flex items-center gap-2 px-1">
          <h3 className="text-xs font-semibold text-ink-900">Casos de prueba</h3>
          <span className="text-[11px] text-ink-400">{testCases.length}</span>
          {testCases.length > 0 && (
            <button type="button" onClick={() => void copyCases()} title="Copia los casos como tabla (Dado / Cuando / Entonces)" className="ml-auto flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-accent hover:bg-accent-soft">
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-[10px]" /> {copied ? 'Copiada' : 'Copiar tabla'}
            </button>
          )}
        </div>
        {!inProject ? (
          <p className="mt-1.5 px-1 text-xs leading-relaxed text-ink-600">Los casos de prueba se guardan en el proyecto. Agrega este diagrama a un proyecto para guardarlos y enlazarlos con sus requisitos.</p>
        ) : testCases.length === 0 ? (
          <p className="mt-1.5 px-1 text-xs leading-relaxed text-ink-600">Guarda abajo los caminos que quieras probar: cada uno queda como un caso con Dado / Cuando / Entonces.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {testCases.map((item) => (
              <TestCaseCard
                key={item.id}
                item={item}
                open={openId === item.id}
                stale={stale.has(item.id)}
                onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                onShow={() => showCase(item)}
                onWalk={() => walk(item.choices)}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Caminos posibles" className="px-3 py-3">
        <h3 className="px-1 text-xs font-semibold text-ink-900">Caminos posibles <span className="font-normal text-ink-400">{scenarios.length}</span></h3>
        <p className="mt-0.5 px-1 text-[11px] leading-snug text-ink-400">Cada combinación de decisiones que llega al final. Los subprocesos se abren por cada resultado; los bucles, una vuelta.</p>
        {scenarios.length === 0 ? (
          <p className="mt-2 px-1 text-xs text-ink-600">El proceso no tiene caminos que lleguen a un final: revisa el recorrido paso a paso.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {scenarios.map((scenario, index) => {
              const saved = savedByKey.get(scenario.key);
              return (
                <li key={scenario.key} className="rounded-lg border border-line px-2.5 py-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 w-5 shrink-0 text-right text-[11px] font-semibold tabular-nums text-ink-400">{index + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-ink-900">{scenarioTitle(diagram, scenario.choices)}</p>
                      <p className={`mt-0.5 text-[11px] ${scenario.final.status === 'stuck' ? 'text-danger' : 'text-ink-400'}`}>
                        {scenario.final.status === 'stuck' ? 'Se traba sin llegar a un final' : scenario.final.outcome?.from === 'final' ? `Termina en «${scenario.final.outcome.label}»` : 'Llega al final'} · {scenario.final.visitedNodeIds.length} nodos
                      </p>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1 pl-7">
                    <button type="button" onClick={() => show(scenario.key, scenario.final.visitedNodeIds, scenario.final.visitedEdgeIds)} className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-ink-600 hover:bg-canvas hover:text-ink-900">
                      <FontAwesomeIcon icon={faEye} className="text-[10px]" /> Ver
                    </button>
                    <button type="button" onClick={() => walk(scenario.choices)} className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-ink-600 hover:bg-canvas hover:text-ink-900">
                      <FontAwesomeIcon icon={faRoute} className="text-[10px]" /> Recorrer
                    </button>
                    {saved ? (
                      <button type="button" onClick={() => setOpenId(saved.id)} className="ml-auto flex h-7 items-center gap-1.5 rounded-md bg-success-soft px-2 text-[11px] font-semibold text-success">
                        <FontAwesomeIcon icon={faCheck} className="text-[10px]" /> {saved.code}
                      </button>
                    ) : inProject && (
                      <button type="button" onClick={() => save(scenario)} className="ml-auto flex h-7 items-center gap-1.5 rounded-md bg-accent-soft px-2 text-[11px] font-medium text-accent hover:bg-accent hover:text-white">
                        <FontAwesomeIcon icon={faFloppyDisk} className="text-[10px]" /> Guardar como caso
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {truncated && <p className="mt-2 px-1 text-[11px] text-warning">Se muestran los primeros {MAX_SCENARIOS} caminos: el proceso tiene más. Divídelo en subprocesos para probarlo por partes.</p>}
      </section>
    </div>
  );
}

/** Un caso de prueba: cerrado, su código, nombre y estado; abierto, su ficha editable. */
function TestCaseCard({ item, open, stale, onToggle, onShow, onWalk }: { item: TestCase; open: boolean; stale: boolean; onToggle: () => void; onShow: () => void; onWalk: () => void }) {
  const requirements = useProjectStore((state) => state.project?.requirements);
  const [chosen, setChosen] = useState('');
  const update = (patch: Partial<TestCase>) => useProjectStore.getState().updateTestCase(item.id, patch);
  const linked = (requirements ?? []).filter((requirement) => item.requirementIds.includes(requirement.id));
  const available = (requirements ?? []).filter((requirement) => !item.requirementIds.includes(requirement.id) && requirement.status !== 'descartado');
  const field = 'mt-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400';

  return (
    <li className={`rounded-lg border ${open ? 'border-accent/40' : 'border-line'}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2 px-2.5 py-2 text-left">
        <span className="shrink-0 rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-accent">{item.code}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink-900">{item.title || 'Sin nombre'}</span>
        {stale && <FontAwesomeIcon icon={faTriangleExclamation} className="shrink-0 text-[11px] text-warning" title="Desactualizado" />}
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[item.status]}`}>{STATUS_LABEL[item.status]}</span>
        <FontAwesomeIcon icon={faChevronDown} className={`shrink-0 text-[10px] text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-line px-2.5 pt-2 pb-2.5">
          {stale && (
            <p className="rounded-md bg-warning-soft px-2 py-1.5 text-[11px] leading-snug text-warning">
              Desactualizado: el diagrama cambió y este camino ya no se puede recorrer. Vuelve a guardarlo desde «Caminos posibles» y borra este.
            </p>
          )}
          <label className="block">
            <span className={field}>Caso de prueba</span>
            <input defaultValue={item.title} onBlur={(event) => update({ title: event.target.value.trim() })} className={inputClass} />
          </label>
          <label className="block">
            <span className={field}>Dado</span>
            <textarea defaultValue={item.given} onBlur={(event) => update({ given: event.target.value.trim() })} rows={2} placeholder="El socio inició sesión y el libro tiene un ejemplar libre." className={`${inputClass} resize-y`} />
          </label>
          <label className="block">
            <span className={field}>Cuando</span>
            <textarea defaultValue={item.when} onBlur={(event) => update({ when: event.target.value.trim() })} rows={Math.max(2, item.when.split('\n').length)} className={`${inputClass} resize-y`} />
          </label>
          <label className="block">
            <span className={field}>Entonces</span>
            <textarea defaultValue={item.then} onBlur={(event) => update({ then: event.target.value.trim() })} rows={2} className={`${inputClass} resize-y`} />
          </label>
          <div>
            <span className={field}>Verifica</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {linked.map((requirement) => (
                <span key={requirement.id} className="flex items-center gap-1 rounded-md bg-accent-soft py-0.5 pr-0.5 pl-1.5 text-[11px] font-semibold text-accent" title={requirement.title}>
                  {requirement.code}
                  <button type="button" onClick={() => update({ requirementIds: item.requirementIds.filter((id) => id !== requirement.id) })} aria-label={`Quitar ${requirement.code}`} className="flex size-4 items-center justify-center rounded hover:bg-accent hover:text-white">
                    <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
                  </button>
                </span>
              ))}
            </div>
            {available.length > 0 && (
              <div className="mt-1 flex gap-1.5">
                <select aria-label="Requisito que verifica" value={chosen} onChange={(event) => setChosen(event.target.value)} className={inputClass}>
                  <option value="">Requisito que verifica…</option>
                  {available.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.code} · {requirement.title}</option>)}
                </select>
                <button type="button" disabled={!chosen} onClick={() => { update({ requirementIds: [...item.requirementIds, chosen] }); setChosen(''); }} aria-label="Agregar requisito" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white disabled:opacity-40">
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                </button>
              </div>
            )}
          </div>
          <div>
            <span className={field}>Resultado de la prueba</span>
            <div role="radiogroup" aria-label="Resultado de la prueba" className="mt-1 flex gap-1">
              {TEST_STATUSES.map((status) => (
                <button key={status} type="button" role="radio" aria-checked={item.status === status} onClick={() => update({ status })} className={`h-7 flex-1 rounded-md text-[11px] font-semibold ${item.status === status ? STATUS_STYLE[status] : 'text-ink-400 hover:bg-canvas'}`}>
                  {STATUS_LABEL[status]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1 pt-1">
            <button type="button" onClick={onShow} className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-ink-600 hover:bg-canvas hover:text-ink-900"><FontAwesomeIcon icon={faEye} className="text-[10px]" /> Ver</button>
            {!stale && <button type="button" onClick={onWalk} className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-ink-600 hover:bg-canvas hover:text-ink-900"><FontAwesomeIcon icon={faRoute} className="text-[10px]" /> Recorrer</button>}
            <button
              type="button"
              onClick={() => { if (window.confirm(`¿Borrar el caso ${item.code}?`)) useProjectStore.getState().deleteTestCase(item.id); }}
              className="ml-auto flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-ink-400 hover:bg-danger-soft hover:text-danger"
            >
              <FontAwesomeIcon icon={faTrashCan} className="text-[10px]" /> Borrar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * Al terminar un recorrido: guardar el camino que se acaba de recorrer como
 * caso de prueba (o mostrar con qué caso ya está guardado).
 */
export function SaveWalkAsTestCase({ diagram, state }: { diagram: Diagram; state: WalkState }) {
  const project = useProjectStore((store) => store.project);
  if (!project?.diagramIds.includes(diagram.id)) return null;
  const key = scenarioKey(state.choices);
  const saved = project.testCases.find((item) => item.diagramId === diagram.id && scenarioKey(item.choices) === key);
  return (
    <li className="rounded-lg border border-line bg-surface p-2.5">
      {saved ? (
        <p className="flex items-center gap-2 px-1 text-xs text-ink-900">
          <FontAwesomeIcon icon={faCheck} className="text-success" /> Este camino ya es el caso de prueba <span className="font-semibold">{saved.code}</span> (en Escenarios).
        </p>
      ) : (
        <button
          type="button"
          onClick={() => useProjectStore.getState().addTestCase({ diagramId: diagram.id, choices: state.choices, ...draftTestCase(diagram, state.choices, state) })}
          className="flex w-full items-center gap-2 rounded-md bg-accent-soft px-2.5 py-1.5 text-left text-sm font-medium text-accent hover:bg-accent hover:text-white"
        >
          <FontAwesomeIcon icon={faFloppyDisk} className="text-xs" /> Guardar este camino como caso de prueba
        </button>
      )}
    </li>
  );
}
