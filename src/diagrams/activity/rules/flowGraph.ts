import type { Diagram, DiagramEdge, DiagramNode } from '@/core/model';
import { ActivityArtifact as A, FLOW_EDGE_TYPES } from '../artifactTypes';

/**
 * Vista del diagrama como grafo de flujos (control y objeto). Los carriles,
 * las notas y sus anclajes no son parte del flujo y quedan fuera.
 */
export interface FlowGraph {
  /** Nodos que participan del flujo. */
  nodes: DiagramNode[];
  outgoing: Map<string, DiagramEdge[]>;
  incoming: Map<string, DiagramEdge[]>;
  nodeById: Map<string, DiagramNode>;
}

const NON_FLOW_NODES: ReadonlySet<string> = new Set([A.partition, A.note]);

export function buildFlowGraph(diagram: Diagram): FlowGraph {
  const nodes = diagram.nodes.filter((node) => !NON_FLOW_NODES.has(node.artifactType));
  const outgoing = new Map<string, DiagramEdge[]>(nodes.map((node) => [node.id, []]));
  const incoming = new Map<string, DiagramEdge[]>(nodes.map((node) => [node.id, []]));

  for (const edge of diagram.edges) {
    if (!FLOW_EDGE_TYPES.has(edge.artifactType)) continue;
    outgoing.get(edge.sourceId)?.push(edge);
    incoming.get(edge.targetId)?.push(edge);
  }
  return { nodes, outgoing, incoming, nodeById: new Map(nodes.map((node) => [node.id, node])) };
}

export const outgoingOf = (graph: FlowGraph, nodeId: string) => graph.outgoing.get(nodeId) ?? [];
export const incomingOf = (graph: FlowGraph, nodeId: string) => graph.incoming.get(nodeId) ?? [];

export function nodesOfType(graph: FlowGraph, artifactType: string): DiagramNode[] {
  return graph.nodes.filter((node) => node.artifactType === artifactType);
}

/**
 * Dónde empieza el flujo: los nodos iniciales y las aceptaciones de evento sin
 * entrada (UML 2.5 las activa al iniciar la actividad para que esperen su evento).
 */
export function startNodeIds(graph: FlowGraph): string[] {
  return graph.nodes
    .filter(
      (node) =>
        node.artifactType === A.initialNode ||
        (node.artifactType === A.acceptEvent && incomingOf(graph, node.id).length === 0),
    )
    .map((node) => node.id);
}

/** Todos los nodos alcanzables siguiendo flechas hacia adelante (incluye los de partida). */
export function reachableFrom(graph: FlowGraph, startIds: string[]): Set<string> {
  const visited = new Set<string>();
  const pending = [...startIds];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const edge of outgoingOf(graph, id)) pending.push(edge.targetId);
  }
  return visited;
}

/**
 * Recorre las flechas hacia ATRÁS desde `fromId` y devuelve los nodos visitados.
 * Al llegar a un nodo que cumple `stopAt` lo incluye pero no sigue más allá:
 * sirve para preguntar "¿de qué fork o decisión viene este camino?" sin cruzar
 * el punto que cierra esa estructura.
 */
export function walkBackward(graph: FlowGraph, fromId: string, stopAt: (node: DiagramNode) => boolean): Set<string> {
  const visited = new Set<string>();
  const pending = [fromId];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = graph.nodeById.get(id);
    if (!node || (id !== fromId && stopAt(node))) continue;
    for (const edge of incomingOf(graph, id)) pending.push(edge.sourceId);
  }
  return visited;
}

/** Nombre legible de un nodo para los mensajes. */
export function describeNode(node: DiagramNode | undefined, fallback: string): string {
  return node?.label.trim() ? `«${node.label.trim()}»` : fallback;
}
