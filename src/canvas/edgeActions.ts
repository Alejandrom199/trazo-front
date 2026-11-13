import { absolutePosition, type Diagram, type DiagramEdge, type DiagramNode, type Position } from '@/core/model';
import type { DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { connectionPath } from './connectionPath';
import type { Rect } from './edgeGeometry';
import { insertWaypoint } from './edgePath';
import { snapPoint } from './gridStore';

/** ¿La flecha admite vértices? Los mensajes horizontales no: solo suben o bajan. */
export function acceptsWaypoints(module: DiagramModule, artifactType: string): boolean {
  return module.edgeKinds[artifactType]?.layout !== 'horizontal';
}

/**
 * Agrega un vértice a la flecha en `point` (coordenadas del lienzo), en el tramo
 * más cercano, ajustado a la cuadrícula si está visible. Es un paso de deshacer.
 */
export function addWaypointAt(module: DiagramModule, edgeId: string, point: Position): void {
  const { diagram } = useDiagramStore.getState();
  const edge = diagram?.edges.find((candidate) => candidate.id === edgeId);
  const source = diagram?.nodes.find((node) => node.id === edge?.sourceId);
  const target = diagram?.nodes.find((node) => node.id === edge?.targetId);
  if (!diagram || !edge || !source || !target || !acceptsWaypoints(module, edge.artifactType)) return;

  const path = connectionPath(diagram, module, edge, nodeRect(diagram, source), nodeRect(diagram, target));
  // El tramo se elige con el punto exacto del clic; el vértice queda en la celda más cercana.
  const { waypoints, index } = insertWaypoint(path, edge.waypoints, point);
  waypoints[index] = snapPoint(point);
  useDiagramStore.getState().updateEdge(edgeId, { waypoints });
}

/**
 * ¿Se puede invertir la flecha? La misma regla que al conectar a mano, pero de
 * destino a origen (sin contar la propia flecha, que dejaría de existir así).
 */
export function canReverseEdge(module: DiagramModule, diagram: Diagram, edge: DiagramEdge): boolean {
  const others = { ...diagram, edges: diagram.edges.filter((other) => other.id !== edge.id) };
  return module.resolveConnection(others, edge.targetId, edge.sourceId).allowed;
}

/**
 * Invierte la flecha: el destino pasa a ser el origen y los vértices se recorren al
 * revés, así sigue pasando por los mismos puntos (en ortogonal, los codos entre ellos
 * pueden cambiar, porque salen del nuevo origen). En agregación y composición, el
 * rombo (que va en el origen) pasa a la otra clase. Es un paso de deshacer.
 */
export function reverseEdge(module: DiagramModule, edgeId: string): void {
  const { diagram } = useDiagramStore.getState();
  const edge = diagram?.edges.find((candidate) => candidate.id === edgeId);
  if (!diagram || !edge || !canReverseEdge(module, diagram, edge)) return;
  useDiagramStore.getState().updateEdge(edgeId, {
    sourceId: edge.targetId,
    targetId: edge.sourceId,
    waypoints: [...edge.waypoints].reverse(),
  });
}

/** Caja del nodo en el lienzo; es la misma que mide React Flow (adapters fija `measured` con el tamaño). */
function nodeRect(diagram: Diagram, node: DiagramNode): Rect {
  return { ...absolutePosition(diagram, node), ...node.size };
}
