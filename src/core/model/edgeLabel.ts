import type { DiagramEdge, Position } from './diagram';

/**
 * El texto de una conexión (guarda o nombre de mensaje) se dibuja en su punto
 * medio; el usuario puede arrastrarlo a un lado para que no tape nada. Ese
 * desplazamiento se guarda en edge.props, relativo al punto medio, así acompaña
 * a la flecha cuando se mueven sus nodos.
 */
export const LABEL_OFFSET_KEY = 'labelOffset';

const NO_OFFSET: Position = { x: 0, y: 0 };

export function readLabelOffset(edge: DiagramEdge): Position {
  const value = edge.props[LABEL_OFFSET_KEY];
  if (typeof value !== 'object' || value === null) return NO_OFFSET;
  const { x, y } = value as Record<string, unknown>;
  return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) ? { x, y } : NO_OFFSET;
}
