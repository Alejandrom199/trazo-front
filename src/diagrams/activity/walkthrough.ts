import {
  linkedTemplateId,
  mergeFacts,
  readLinkedDiagramId,
  rememberFact,
  suggestExit,
  type Diagram,
  type DiagramEdge,
  type DiagramNode,
  type WalkEntry,
  type WalkFact,
  type WalkOutcome,
  type WalkReturn,
  type WalkState,
  type WalkthroughEngine,
} from '@/core/model';
import { ActivityArtifact as A } from './artifactTypes';
import { buildFlowGraph, describeNode, incomingOf, outgoingOf, startNodeIds, type FlowGraph } from './rules/flowGraph';

/**
 * Recorrido paso a paso del diagrama de actividades, con la semántica de tokens
 * de UML 2.5 (simplificada):
 * - Avanza un token por paso, el más antiguo primero.
 * - Decisión con varias salidas: se detiene y el usuario elige el camino.
 * - Fork, y toda acción con varias salidas: un token por CADA salida (paralelo).
 * - Join, y toda acción con varias entradas: espera un token por CADA entrada.
 * - Fusión, decisión y finales: les basta un token por cualquier entrada.
 * - Final de actividad: termina todo. Final de flujo: termina solo ese camino.
 * - Subproceso (⋔) enlazado a otro diagrama: se detiene y se decide si entrar
 *   a recorrerlo (lo hace la interfaz, en ese diagrama) o seguir sin entrar.
 * - Memoria (ver core/model/walkMemory): el final con nombre es el resultado del
 *   diagrama; la decisión que sigue a un subproceso sugiere la salida que
 *   coincide con su resultado, y una pregunta ya respondida sugiere su respuesta.
 * Lo que el diagrama hace distinto de lo que parece (una acción que espera dos
 * caminos alternativos, dos salidas que no eligen) se avisa en el registro.
 */

/** Nodos a los que les basta un token por cualquiera de sus entradas. */
const ANY_INPUT: ReadonlySet<string> = new Set([A.merge, A.decision, A.activityFinal, A.flowFinal, A.initialNode]);

/** Tope de tokens vivos: un bucle con fork podría multiplicarlos sin fin. */
const MAX_TOKENS = 50;

function entry(text: string, tone: WalkEntry['tone'], nodeIds: string[], edgeIds: string[] = []): WalkEntry {
  return { text: text.charAt(0).toUpperCase() + text.slice(1), tone, nodeIds, edgeIds };
}

/** Carril que contiene al nodo, para decir quién hace el paso. */
function laneOf(diagram: Diagram, node: DiagramNode): string | null {
  const parent = node.parentId ? diagram.nodes.find((candidate) => candidate.id === node.parentId) : undefined;
  return parent?.artifactType === A.partition && parent.label.trim() ? parent.label.trim() : null;
}

/** Cómo se cuenta la llegada de un token a un nodo. */
function arrivalText(node: DiagramNode): string {
  const named = (fallback: string) => describeNode(node, fallback);
  switch (node.artifactType) {
    case A.action: return `se ejecuta ${named('una acción sin nombre')}.`;
    case A.callBehavior: return `se ejecuta el subproceso ${named('sin nombre')}.`;
    case A.objectNode: return `se produce el objeto ${named('sin nombre')}.`;
    case A.sendSignal: return `se envía la señal ${named('sin nombre')}.`;
    case A.acceptEvent: return `se espera el evento ${named('sin nombre')}.`;
    case A.decision: return node.label.trim() ? `llega a la decisión «${node.label.trim()}».` : 'llega a una decisión.';
    case A.merge: return 'los caminos alternativos se reúnen en la fusión.';
    case A.fork: return 'llega al fork: desde aquí los caminos van en paralelo.';
    case A.join: return 'pasa por el join.';
    default: return `llega a ${named('un nodo sin nombre')}.`;
  }
}

/** Lo que distingue una salida de una decisión: su guarda o, si no tiene, su texto. */
const exitText = (edge: DiagramEdge): string => edge.guard?.trim() || edge.label.trim();

/** Nodos por los que el resultado de un subproceso llega hasta la decisión que lo usa. */
const CARRIES: ReadonlySet<string> = new Set([A.merge, A.decision]);

/** Texto de un camino elegible en una decisión: su guarda y adónde lleva. */
function optionLabel(graph: FlowGraph, edge: DiagramEdge): string {
  const target = describeNode(graph.nodeById.get(edge.targetId), 'el siguiente nodo');
  const condition = edge.guard?.trim() ? `[${edge.guard.trim()}]` : edge.label.trim() || 'sin guarda';
  return `${condition} → ${target}`;
}

class Walk {
  private state: WalkState;

  constructor(
    private readonly diagram: Diagram,
    private readonly graph: FlowGraph,
    state: WalkState,
  ) {
    this.state = { ...state, tokens: [...state.tokens], waiting: { ...state.waiting }, log: [...state.log], visitedNodeIds: [...state.visitedNodeIds], visitedEdgeIds: [...state.visitedEdgeIds], facts: [...state.facts] };
  }

  result(): WalkState {
    return this.state;
  }

  private say(item: WalkEntry) {
    this.state.log.push(item);
  }

  private visit(nodeId: string, edgeId: string | null) {
    if (!this.state.visitedNodeIds.includes(nodeId)) this.state.visitedNodeIds.push(nodeId);
    if (edgeId && !this.state.visitedEdgeIds.includes(edgeId)) this.state.visitedEdgeIds.push(edgeId);
  }

  /** Mueve un token por una flecha y lo hace llegar (o esperar) en su destino. */
  moveAlong(edge: DiagramEdge, carried: WalkOutcome | null = null) {
    const target = this.graph.nodeById.get(edge.targetId);
    if (!target) return;
    this.visit(target.id, edge.id);
    const inputs = incomingOf(this.graph, target.id);
    const needsAll = inputs.length > 1 && !ANY_INPUT.has(target.artifactType);

    if (needsAll) {
      const arrived = [...new Set([...(this.state.waiting[target.id] ?? []), edge.id])];
      if (arrived.length < inputs.length) {
        this.state.waiting[target.id] = arrived;
        const name = describeNode(target, target.artifactType === A.join ? 'el join' : 'el nodo');
        this.say(target.artifactType === A.join
          ? entry(`${name} espera: llegó ${arrived.length} de ${inputs.length} caminos paralelos.`, 'wait', [target.id], [edge.id])
          : entry(`${name} tiene ${inputs.length} entradas y espera a TODAS (llegó ${arrived.length}). Si son caminos alternativos, júntalos antes con una fusión.`, 'warning', [target.id], [edge.id]));
        return;
      }
      delete this.state.waiting[target.id];
      if (target.artifactType === A.join) {
        this.say(entry(`llegaron los ${inputs.length} caminos: el join los reúne y el proceso continúa.`, 'parallel', [target.id], [edge.id]));
        this.addToken(target.id, edge.id);
        return;
      }
    }
    this.arrive(target, edge, carried);
  }

  private arrive(target: DiagramNode, edge: DiagramEdge, carried: WalkOutcome | null) {
    if (target.artifactType === A.activityFinal) {
      const others = this.state.tokens.length + Object.keys(this.state.waiting).length;
      this.say(entry(`el proceso termina en el final de actividad${target.label.trim() ? ` «${target.label.trim()}»` : ''}.${others > 0 ? ` Se detienen también los otros ${others} caminos que seguían activos.` : ''}`, 'end', [target.id], [edge.id]));
      this.state.tokens = [];
      this.state.waiting = {};
      this.state.status = 'finished';
      this.state.outcome = this.outcomeAt(target);
      return;
    }
    if (target.artifactType === A.flowFinal) {
      this.say(entry('este camino termina en un final de flujo; los demás siguen su curso.', 'end', [target.id], [edge.id]));
      return;
    }
    const guard = edge.guard?.trim() ? `[${edge.guard.trim()}] ` : '';
    const lane = laneOf(this.diagram, target);
    const text = arrivalText(target);
    this.say(entry(`${guard}${lane ? `${lane}: ` : ''}${text}`, target.artifactType === A.fork ? 'parallel' : 'step', [target.id], [edge.id]));
    this.addToken(target.id, edge.id, CARRIES.has(target.artifactType) ? carried : null);
  }

  /** R1: el nombre del final o, si no tiene, la última respuesta dada en este diagrama. */
  private outcomeAt(final: DiagramNode): WalkOutcome | null {
    const diagramName = this.diagram.name.trim() || 'el subproceso';
    if (final.label.trim()) return { label: final.label.trim(), from: 'final', diagramName };
    const last = [...this.state.facts].reverse().find((fact) => this.graph.nodeById.has(fact.nodeId));
    return last ? { label: last.answer, from: 'decision', diagramName } : null;
  }

  private addToken(nodeId: string, viaEdgeId: string | null, carried: WalkOutcome | null = null) {
    this.state.tokens.push({ id: this.state.nextTokenId, nodeId, viaEdgeId, carried });
    this.state.nextTokenId += 1;
  }

  /** Avanza el token más antiguo. Con `pastCall`, el subproceso en que está ya se resolvió. */
  advance(pastCall = false) {
    const token = this.state.tokens.shift();
    if (!token) return;
    const node = this.graph.nodeById.get(token.nodeId);
    const outputs = outgoingOf(this.graph, token.nodeId);
    if (!node) return;

    const isCall = node.artifactType === A.callBehavior;
    const linked = isCall ? readLinkedDiagramId(node) : null;
    const template = isCall && !linked ? linkedTemplateId(node.props) : null;
    if ((linked || template) && !pastCall) {
      this.state.tokens.unshift(token);
      this.state.status = 'call';
      this.state.call = { tokenId: token.id, nodeId: node.id, diagramId: linked, templateId: template };
      this.say(entry(`${describeNode(node, 'el subproceso')} tiene su propio diagrama: ¿entrar a recorrerlo o seguir sin entrar?`, 'choice', [node.id]));
      return;
    }

    if (outputs.length === 0) {
      this.say(entry(`${describeNode(node, 'este nodo')} no tiene salida: este camino se detiene aquí sin llegar a un final.`, 'warning', [node.id]));
      return;
    }
    if (node.artifactType === A.decision && outputs.length > 1) {
      const carried = token.carried ?? null;
      const suggested = suggestExit(node.label, node.id, outputs.map((edge) => ({ edgeId: edge.id, guard: exitText(edge) })), carried, this.state.facts);
      this.state.tokens.unshift(token);
      this.state.status = 'choice';
      this.state.choice = { tokenId: token.id, nodeId: node.id, options: outputs.map((edge) => ({ edgeId: edge.id, label: optionLabel(this.graph, edge) })), suggested };
      const question = `decisión ${describeNode(node, 'sin pregunta')}`;
      if (suggested) {
        const guard = exitText(outputs.find((edge) => edge.id === suggested.edgeId)!);
        this.say(entry(`${question}: sigue por [${guard}]. ${suggested.reason}`, 'choice', [node.id], [suggested.edgeId]));
      } else if (carried) {
        this.say(entry(`«${carried.diagramName}» terminó en «${carried.label}», pero ninguna salida de la ${question} se llama así: elige tú. Para que el recorrido siga solo, nombra el final del subproceso igual que la guarda.`, 'warning', [node.id], outputs.map((edge) => edge.id)));
      } else {
        this.say(entry(`${question}: elige por dónde sigue.`, 'choice', [node.id], outputs.map((edge) => edge.id)));
      }
      return;
    }
    if (outputs.length > 1) {
      this.say(node.artifactType === A.fork
        ? entry(`se abren ${outputs.length} caminos en paralelo.`, 'parallel', [node.id], outputs.map((edge) => edge.id))
        : entry(`${describeNode(node, 'este nodo')} tiene ${outputs.length} salidas: sale un token por CADA una, en paralelo. Si querías elegir una, usa una decisión.`, 'warning', [node.id], outputs.map((edge) => edge.id)));
    }
    // El resultado del subproceso pasa a la decisión que sigue (por fusiones), y a nada más.
    const carried = (pastCall && isCall) || CARRIES.has(node.artifactType) ? (token.carried ?? null) : null;
    for (const edge of outputs) this.moveAlong(edge, carried);
  }

  /** Sigue por el camino elegido en la decisión pendiente. */
  choose(edgeId: string) {
    const choice = this.state.choice;
    const edge = choice && outgoingOf(this.graph, choice.nodeId).find((candidate) => candidate.id === edgeId);
    if (!choice || !edge) return;
    this.state.tokens = this.state.tokens.filter((token) => token.id !== choice.tokenId);
    this.state.choice = null;
    this.state.status = 'running';
    const node = this.graph.nodeById.get(choice.nodeId);
    const answer = exitText(edge);
    const expected = choice.suggested && choice.suggested.edgeId !== edgeId ? outgoingOf(this.graph, choice.nodeId).find((candidate) => candidate.id === choice.suggested!.edgeId) : undefined;
    if (expected) {
      this.say(entry(`elegiste [${answer || 'sin guarda'}], pero lo decidido indicaba [${exitText(expected)}]. ${choice.suggested!.reason} Si el proceso vuelve a preguntar algo ya resuelto, revisa el diagrama.`, 'warning', [choice.nodeId], [edgeId]));
    }
    if (node && answer) this.state.facts = rememberFact(this.state.facts, { question: node.label.trim(), answer, nodeId: node.id, diagramName: this.diagram.name.trim() || 'este diagrama' });
    this.moveAlong(edge);
  }

  /** Sale del subproceso pendiente y sigue por sus salidas, con su resultado si se recorrió. */
  resume(how: 'skipped' | 'returned', result?: WalkReturn) {
    const call = this.state.call;
    if (!call) return;
    const node = this.graph.nodeById.get(call.nodeId);
    this.state.call = null;
    this.state.status = 'running';
    // El token del subproceso pasa al frente para avanzar ya.
    const index = this.state.tokens.findIndex((token) => token.id === call.tokenId);
    if (index > 0) this.state.tokens.unshift(...this.state.tokens.splice(index, 1));
    const outcome = how === 'returned' ? (result?.outcome ?? null) : null;
    if (how === 'returned' && result) this.state.facts = mergeFacts(this.state.facts, result.facts);
    if (this.state.tokens[0]?.id === call.tokenId) this.state.tokens[0] = { ...this.state.tokens[0], carried: outcome };
    const name = describeNode(node, 'el subproceso');
    this.say(how === 'returned'
      ? entry(outcome ? `terminó ${name} en «${outcome.label}»; el proceso continúa.` : `terminó ${name}; el proceso continúa.`, 'step', [call.nodeId])
      : entry(`se sigue sin entrar en ${name}, como si fuera un solo paso.`, 'step', [call.nodeId]));
    this.advance(true);
  }

  /** Tras un paso: ¿terminó, se trabó o se descontroló? */
  settle() {
    if (this.state.status !== 'running') return;
    if (this.state.tokens.length > MAX_TOKENS) {
      this.state.status = 'stuck';
      this.say(entry(`hay más de ${MAX_TOKENS} caminos activos a la vez: probablemente un bucle vuelve a un fork. El recorrido se detiene.`, 'warning', []));
      return;
    }
    if (this.state.tokens.length > 0) return;
    const waiting = Object.keys(this.state.waiting);
    if (waiting.length > 0) {
      this.state.status = 'stuck';
      const names = waiting.map((id) => describeNode(this.graph.nodeById.get(id), 'un nodo')).join(', ');
      this.say(entry(`el recorrido se trabó: ${names} espera${waiting.length > 1 ? 'n' : ''} caminos que nunca llegarán.`, 'warning', waiting));
      return;
    }
    this.state.status = 'finished';
    this.say(entry('no quedan caminos activos: el recorrido terminó.', 'end', []));
  }
}

function start(diagram: Diagram, facts: WalkFact[] = []): WalkState {
  const graph = buildFlowGraph(diagram);
  const starts = startNodeIds(graph);
  const empty: WalkState = { tokens: [], waiting: {}, choice: null, call: null, status: 'running', log: [], visitedNodeIds: [], visitedEdgeIds: [], nextTokenId: 0, facts: [...facts], outcome: null };
  if (starts.length === 0) {
    return { ...empty, status: 'stuck', log: [entry('no hay nodo inicial: el recorrido no sabe por dónde empezar.', 'warning', [])] };
  }
  const title = diagram.name.trim();
  return {
    ...empty,
    tokens: starts.map((nodeId, index) => ({ id: index, nodeId, viaEdgeId: null })),
    nextTokenId: starts.length,
    visitedNodeIds: starts,
    log: [entry(title ? `empieza «${title}».` : 'empieza el proceso.', 'step', starts)],
  };
}

function step(diagram: Diagram, state: WalkState, chosenEdgeId?: string): WalkState {
  if (state.status === 'finished' || state.status === 'stuck' || state.status === 'call') return state;
  if (state.status === 'choice' && !chosenEdgeId) return state;
  const walk = new Walk(diagram, buildFlowGraph(diagram), state);
  if (state.status === 'choice' && chosenEdgeId) walk.choose(chosenEdgeId);
  else walk.advance();
  walk.settle();
  return walk.result();
}

function resumeCall(diagram: Diagram, state: WalkState, how: 'skipped' | 'returned', result?: WalkReturn): WalkState {
  if (state.status !== 'call') return state;
  const walk = new Walk(diagram, buildFlowGraph(diagram), state);
  walk.resume(how, result);
  walk.settle();
  return walk.result();
}

export const activityWalkthrough: WalkthroughEngine = { start, step, resumeCall };
