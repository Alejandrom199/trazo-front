import type { Diagram, DiagramEdge, DiagramNode, Narration } from '@/core/model';
import { ActivityArtifact as A } from './artifactTypes';
import { buildFlowGraph, outgoingOf, startNodeIds, type FlowGraph } from './rules/flowGraph';

/**
 * Narrador del diagrama de actividades: recorre el grafo desde el inicio y lo
 * cuenta en español. Es determinista (mismo diagrama ⇒ mismo texto) y no usa IA.
 *
 * Estructura del recorrido:
 * - Secuencia: un paso tras otro, mencionando el carril cuando cambia ("quién hace qué").
 * - Decisión: "Se toma una decisión", y cada salida como "Si [guarda]:" con sus pasos.
 * - Fork (o un nodo con varias salidas): "N tareas en paralelo", cada rama por separado.
 * - Las ramas se cuentan hasta su punto de reunión (la fusión o el join al que llegan
 *   al menos dos de ellas); después se sigue desde ahí.
 * - Un nodo ya contado no se repite: se dice "vuelve a «…»" (bucles).
 */
export function narrateActivity(diagram: Diagram): Narration {
  const graph = buildFlowGraph(diagram);
  if (graph.nodes.length === 0) return [];
  return new ActivityNarrator(diagram, graph).run();
}

type Connector = 'primero, ' | 'luego, ' | '';

/** Por qué terminó de contarse un tramo: llegó a un punto de reunión, o no sigue más. */
type WalkEnd = { kind: 'converged'; nodeId: string } | { kind: 'ended' };

class ActivityNarrator {
  private readonly lines: Narration = [];
  private readonly told = new Set<string>();
  private readonly laneNameById: Map<string, string>;
  private currentLane: string | null = null;
  /** Palabra con la que empieza el próximo paso: "primero" al arrancar, nada al abrir una rama, "luego" después. */
  private nextConnector: Connector = 'primero, ';

  constructor(
    private readonly diagram: Diagram,
    private readonly graph: FlowGraph,
  ) {
    this.laneNameById = new Map(
      diagram.nodes
        .filter((node) => node.artifactType === A.partition)
        .map((lane) => [lane.id, lane.label.trim() || 'un carril sin nombre']),
    );
  }

  run(): Narration {
    const starts = this.orderedStarts();
    if (starts.length === 0) {
      this.say(0, 'El diagrama no tiene nodo inicial, así que no se puede saber por dónde empieza.', []);
      return this.lines;
    }

    const title = this.diagram.name.trim();
    starts.forEach((start, index) => {
      if (index === 0) {
        this.say(0, title ? `El proceso «${title}» empieza en el nodo inicial.` : 'El proceso empieza en el nodo inicial.', [start]);
      } else {
        this.say(0, this.independentStartText(start), [start]);
      }
      this.told.add(start.id);
      this.nextConnector = 'primero, ';
      this.continueAfter(start, 0, new Set());
    });
    return this.lines;
  }

  // ── Recorrido ────────────────────────────────────────────────────────────────

  /** Cuenta lo que viene después de `node` (sus salidas), sin volver a contar `node`. */
  private continueAfter(node: DiagramNode, depth: number, stopAt: ReadonlySet<string>): WalkEnd {
    const exits = outgoingOf(this.graph, node.id);
    if (exits.length === 0) return this.describeEnd(node, depth);
    if (node.artifactType === A.decision) return this.describeDecision(node, exits, depth, stopAt);
    if (exits.length > 1) return this.describeParallel(node, exits, depth, stopAt);
    return this.walk(exits[0]!, depth, stopAt);
  }

  /** Sigue una flecha: cuenta su destino y lo que viene después. */
  private walk(edge: DiagramEdge, depth: number, stopAt: ReadonlySet<string>): WalkEnd {
    const node = this.graph.nodeById.get(edge.targetId);
    if (!node) return { kind: 'ended' };
    if (stopAt.has(node.id)) return { kind: 'converged', nodeId: node.id };

    if (this.told.has(node.id)) {
      this.say(depth, `Después vuelve a ${this.revisitName(node)}.`, [node], [edge]);
      return { kind: 'ended' };
    }
    this.told.add(node.id);

    this.describeStep(node, edge, depth);
    return this.continueAfter(node, depth, stopAt);
  }

  private describeDecision(node: DiagramNode, exits: DiagramEdge[], depth: number, stopAt: ReadonlySet<string>): WalkEnd {
    this.say(depth, `${this.connector()}se toma una decisión:`, [node]);
    const lane = this.currentLane;
    const meeting = this.meetingPoint(exits, A.merge);
    const innerStop = withMeeting(stopAt, meeting);

    const ends = orderBranches(exits).map((exit) => {
      this.say(depth + 1, exit.guard?.trim() ? `Si [${exit.guard.trim()}]:` : 'Por el camino sin guarda:', [], [exit]);
      this.startBranch(lane);
      return this.walk(exit, depth + 2, innerStop);
    });
    return this.afterBranches(meeting, ends, depth, stopAt, 'Los caminos se reúnen y el proceso continúa.');
  }

  private describeParallel(node: DiagramNode, exits: DiagramEdge[], depth: number, stopAt: ReadonlySet<string>): WalkEnd {
    const intro =
      node.artifactType === A.fork
        ? `${this.connector()}el flujo se divide: ${exits.length} tareas ocurren en paralelo.`
        : `${this.connector()}el flujo sigue por ${exits.length} caminos a la vez.`;
    this.say(depth, intro, [node]);
    const lane = this.currentLane;
    const meeting = this.meetingPoint(exits, A.join);
    const innerStop = withMeeting(stopAt, meeting);

    const ends = exits.map((exit, index) => {
      this.say(depth + 1, `Rama ${index + 1}:`, [], [exit]);
      this.startBranch(lane);
      return this.walk(exit, depth + 2, innerStop);
    });
    return this.afterBranches(meeting, ends, depth, stopAt, 'Cuando terminan las ramas que llegan al join, el proceso continúa.');
  }

  /** Tras contar las ramas: si se reúnen, se sigue desde el punto de reunión. */
  private afterBranches(
    meeting: string | null,
    ends: WalkEnd[],
    depth: number,
    stopAt: ReadonlySet<string>,
    meetingText: string,
  ): WalkEnd {
    const meetingNode = meeting ? this.graph.nodeById.get(meeting) : undefined;
    const someoneArrived = ends.some((end) => end.kind === 'converged' && end.nodeId === meeting);
    if (!meetingNode || !someoneArrived) return { kind: 'ended' };

    this.say(depth, meetingText, [meetingNode]);
    this.told.add(meetingNode.id);
    this.nextConnector = 'luego, ';
    return this.continueAfter(meetingNode, depth, stopAt);
  }

  /**
   * Punto de reunión de unas ramas: el nodo del tipo pedido (fusión o join) al que
   * llegan al menos dos de ellas; si hay varios, el más cercano. null si no se reúnen.
   */
  private meetingPoint(exits: DiagramEdge[], type: string): string | null {
    const distancesPerBranch = exits.map((exit) => this.distancesFrom(exit.targetId));
    const candidates = this.graph.nodes.filter(
      (node) => node.artifactType === type && distancesPerBranch.filter((distances) => distances.has(node.id)).length >= 2,
    );
    const totalDistance = (id: string) =>
      distancesPerBranch.reduce((sum, distances) => sum + (distances.get(id) ?? 0), 0);
    return candidates.sort((a, b) => totalDistance(a.id) - totalDistance(b.id))[0]?.id ?? null;
  }

  private distancesFrom(startId: string): Map<string, number> {
    const distances = new Map([[startId, 0]]);
    const queue = [startId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      for (const edge of outgoingOf(this.graph, id)) {
        if (distances.has(edge.targetId)) continue;
        distances.set(edge.targetId, distances.get(id)! + 1);
        queue.push(edge.targetId);
      }
    }
    return distances;
  }

  // ── Frases ───────────────────────────────────────────────────────────────────

  private describeStep(node: DiagramNode, edge: DiagramEdge, depth: number): void {
    const label = node.label.trim();
    const named = label ? `«${label}»` : 'una acción sin nombre';
    switch (node.artifactType) {
      case A.action:
        return this.sayStep(depth, `se ejecuta ${named}.`, node, edge);
      case A.sendSignal:
        return this.sayStep(depth, `se envía la señal ${label ? `«${label}»` : 'sin nombre'}.`, node, edge);
      case A.acceptEvent:
        return this.sayStep(depth, `se espera el evento ${label ? `«${label}»` : 'sin nombre'}.`, node, edge);
      case A.objectNode:
        return this.sayStep(depth, `se genera el objeto ${label ? `«${label}»` : 'sin nombre'}.`, node, edge);
      case A.activityFinal:
        return this.sayStep(depth, 'el proceso termina.', node, edge);
      case A.flowFinal:
        return this.sayStep(depth, 'este flujo termina; el resto del proceso sigue su curso.', node, edge);
      default:
        // Nodos de control (fusión, join, decisión, fork) no se narran como pasos:
        // su efecto se cuenta en la estructura (decisiones, ramas, reuniones).
        return;
    }
  }

  /** Frase de un paso: conector + carril (si cambió) + texto. */
  private sayStep(depth: number, text: string, node: DiagramNode, edge: DiagramEdge): void {
    const lane = node.parentId ? (this.laneNameById.get(node.parentId) ?? null) : null;
    const laneText = lane && lane !== this.currentLane ? `en «${lane}», ` : '';
    if (lane) this.currentLane = lane;
    this.say(depth, `${this.connector()}${laneText}${text}`, [node], [edge]);
  }

  /**
   * Cada rama se cuenta como si empezara desde el punto donde se abrió: sin conector
   * ("Si [x]: se ejecuta…") y con el carril de ese punto, para que si la rama ocurre en
   * otro carril se diga, aunque la rama anterior haya terminado allí.
   */
  private startBranch(laneAtSplit: string | null): void {
    this.nextConnector = '';
    this.currentLane = laneAtSplit;
  }

  private connector(): string {
    const word = this.nextConnector;
    this.nextConnector = 'luego, ';
    return word;
  }

  private describeEnd(node: DiagramNode, depth: number): WalkEnd {
    const isFinal = node.artifactType === A.activityFinal || node.artifactType === A.flowFinal;
    if (!isFinal) this.say(depth, 'Aquí el flujo se detiene: no hay más pasos.', [node]);
    return { kind: 'ended' };
  }

  private independentStartText(start: DiagramNode): string {
    const lane = start.parentId ? this.laneNameById.get(start.parentId) : undefined;
    const who = lane ? `en «${lane}» ` : '';
    if (start.artifactType === A.acceptEvent) {
      this.currentLane = lane ?? this.currentLane;
      return `Además, de forma independiente, ${who}se espera el evento «${start.label.trim() || 'sin nombre'}» desde que empieza el proceso.`;
    }
    return 'Además, otro nodo inicial arranca un flujo a la vez:';
  }

  private revisitName(node: DiagramNode): string {
    if (node.label.trim()) return `«${node.label.trim()}»`;
    // Una fusión no tiene nombre: se nombra el paso que viene justo después.
    const next = outgoingOf(this.graph, node.id)[0];
    const nextNode = next ? this.graph.nodeById.get(next.targetId) : undefined;
    return nextNode?.label.trim() ? `«${nextNode.label.trim()}»` : 'un paso anterior';
  }

  private say(depth: number, text: string, nodes: DiagramNode[], edges: DiagramEdge[] = []): void {
    this.lines.push({
      text: capitalize(text),
      depth,
      nodeIds: nodes.map((node) => node.id),
      edgeIds: edges.map((edge) => edge.id),
    });
  }

  /** Nodos de inicio en orden de lectura: primero los iniciales, de arriba a abajo y de izquierda a derecha. */
  private orderedStarts(): DiagramNode[] {
    const starts = startNodeIds(this.graph).map((id) => this.graph.nodeById.get(id)!);
    const rank = (node: DiagramNode) => (node.artifactType === A.initialNode ? 0 : 1);
    return starts.sort(
      (a, b) => rank(a) - rank(b) || a.position.y - b.position.y || a.position.x - b.position.x,
    );
  }
}

/** Las salidas con guarda primero (en su orden); [else] y las sin guarda, al final. */
function orderBranches(exits: DiagramEdge[]): DiagramEdge[] {
  const weight = (edge: DiagramEdge) => {
    const guard = edge.guard?.trim().toLowerCase();
    if (!guard) return 2;
    return guard === 'else' ? 1 : 0;
  };
  return [...exits].sort((a, b) => weight(a) - weight(b));
}

function withMeeting(stopAt: ReadonlySet<string>, meeting: string | null): ReadonlySet<string> {
  return meeting ? new Set([...stopAt, meeting]) : stopAt;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
