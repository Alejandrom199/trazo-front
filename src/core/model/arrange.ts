import type { Diagram, DiagramNode, Position } from './diagram';
import { absolutePosition } from './operations';

/**
 * Alinear y repartir nodos seleccionados. Se calcula en coordenadas absolutas
 * (nodos dentro de carriles incluidos) y se devuelve la posición nueva relativa a
 * su contenedor, lista para guardar. Los nodos bloqueados sirven de referencia
 * pero no se mueven.
 */

export type Alignment = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';
export type DistributionAxis = 'x' | 'y';

export interface NodePlacement {
  id: string;
  position: Position;
}

interface Box {
  node: DiagramNode;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Origen del contenedor, para volver a coordenadas relativas. */
  parent: Position;
}

function boxesOf(diagram: Diagram, ids: string[]): Box[] {
  const wanted = new Set(ids);
  return diagram.nodes
    .filter((node) => wanted.has(node.id))
    .map((node) => {
      const absolute = absolutePosition(diagram, node);
      return {
        node,
        ...absolute,
        width: node.size.width,
        height: node.size.height,
        parent: { x: absolute.x - node.position.x, y: absolute.y - node.position.y },
      };
    });
}

const toPlacement = (box: Box, x: number, y: number): NodePlacement => ({
  id: box.node.id,
  position: { x: x - box.parent.x, y: y - box.parent.y },
});

/** Alinea los nodos al borde o centro común del grupo (p. ej. «izquierda» = el borde más a la izquierda). */
export function alignNodes(diagram: Diagram, ids: string[], alignment: Alignment): NodePlacement[] {
  const boxes = boxesOf(diagram, ids);
  if (boxes.length < 2) return [];
  const left = Math.min(...boxes.map((box) => box.x));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const top = Math.min(...boxes.map((box) => box.y));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));

  return boxes
    .filter((box) => !box.node.locked)
    .map((box) => {
      switch (alignment) {
        case 'left':
          return toPlacement(box, left, box.y);
        case 'centerX':
          return toPlacement(box, (left + right) / 2 - box.width / 2, box.y);
        case 'right':
          return toPlacement(box, right - box.width, box.y);
        case 'top':
          return toPlacement(box, box.x, top);
        case 'centerY':
          return toPlacement(box, box.x, (top + bottom) / 2 - box.height / 2);
        case 'bottom':
          return toPlacement(box, box.x, bottom - box.height);
      }
    });
}

/**
 * Reparte los nodos con el mismo espacio entre uno y otro a lo largo de un eje.
 * El primero y el último (por su posición) se quedan donde están.
 */
export function distributeNodes(diagram: Diagram, ids: string[], axis: DistributionAxis): NodePlacement[] {
  const boxes = boxesOf(diagram, ids);
  if (boxes.length < 3) return [];
  const start = (box: Box) => (axis === 'x' ? box.x : box.y);
  const size = (box: Box) => (axis === 'x' ? box.width : box.height);
  const sorted = [...boxes].sort((a, b) => start(a) + size(a) / 2 - (start(b) + size(b) / 2));

  const first = sorted[0]!;
  const last = sorted.at(-1)!;
  const span = start(last) + size(last) - start(first);
  const gap = (span - sorted.reduce((sum, box) => sum + size(box), 0)) / (sorted.length - 1);

  let cursor = start(first);
  return sorted.flatMap((box) => {
    const at = cursor;
    cursor += size(box) + gap;
    if (box.node.locked || box === first || box === last) return [];
    return [axis === 'x' ? toPlacement(box, at, box.y) : toPlacement(box, box.x, at)];
  });
}
