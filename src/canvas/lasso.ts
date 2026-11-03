import { absolutePosition, type Diagram, type ElementIds, type Position } from '@/core/model';

/**
 * Selección con lazo (el lápiz): el usuario dibuja un área a mano alzada y se
 * seleccionan los nodos cuyo centro queda dentro (un contenedor, solo si queda
 * entero dentro, para no arrastrar un carril por rozarlo) y las flechas cuyos
 * dos extremos quedaron seleccionados.
 */
export function lassoSelection(diagram: Diagram, polygon: Position[], isContainer: (artifactType: string) => boolean): ElementIds {
  if (polygon.length < 3) return { nodeIds: [], edgeIds: [] };

  const nodeIds = diagram.nodes
    .filter((node) => {
      const { x, y } = absolutePosition(diagram, node);
      const { width, height } = node.size;
      const points = isContainer(node.artifactType)
        ? [{ x, y }, { x: x + width, y }, { x, y: y + height }, { x: x + width, y: y + height }]
        : [{ x: x + width / 2, y: y + height / 2 }];
      return points.every((point) => isInside(point, polygon));
    })
    .map((node) => node.id);

  const selected = new Set(nodeIds);
  const edgeIds = diagram.edges.filter((edge) => selected.has(edge.sourceId) && selected.has(edge.targetId)).map((edge) => edge.id);
  return { nodeIds, edgeIds };
}

/** Si el punto está dentro del polígono (regla par-impar: cuenta cuántos bordes cruza un rayo horizontal). */
export function isInside(point: Position, polygon: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    const crosses = a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}
