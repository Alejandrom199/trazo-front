import type { Diagram, DiagramEdge } from './diagram';
import { absolutePosition } from './operations';

/**
 * Conexiones horizontales (p. ej. los mensajes de un diagrama de secuencia): van
 * de lado a lado a una altura fija, y esa altura es lo que ordena el diagrama.
 * La altura se guarda en edge.props como distancia desde el borde superior del
 * nodo de origen: así el mensaje se mueve con su participante y sigue valiendo
 * si se desplaza todo el diagrama.
 */

export const EDGE_OFFSET_KEY = 'offsetY';

/** Altura por defecto (bajo la cabecera del participante) si la conexión no tiene una guardada. */
export const DEFAULT_EDGE_OFFSET = 80;

/** Altura de un mensaje a sí mismo: baja este tanto antes de volver. */
export const SELF_EDGE_DROP = 24;

export function readEdgeOffset(edge: DiagramEdge): number {
  const value = edge.props[EDGE_OFFSET_KEY];
  return typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_EDGE_OFFSET;
}

/** Altura absoluta en el lienzo de una conexión horizontal. */
export function horizontalEdgeY(diagram: Diagram, edge: DiagramEdge): number {
  const source = diagram.nodes.find((node) => node.id === edge.sourceId);
  return (source ? absolutePosition(diagram, source).y : 0) + readEdgeOffset(edge);
}
