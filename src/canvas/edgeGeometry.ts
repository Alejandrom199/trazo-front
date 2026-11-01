import { Position } from '@xyflow/react';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeEndpoints {
  sourceX: number;
  sourceY: number;
  sourcePosition: Position;
  targetX: number;
  targetY: number;
  targetPosition: Position;
}

/**
 * Conexiones "flotantes": en vez de guardar de qué lado sale cada flecha,
 * se calcula en cada dibujo según dónde están los nodos.
 *
 * - Uno encima del otro (se solapan en horizontal): flecha vertical, de centro a
 *   centro (con un pequeño escalón si no están alineados); hacia una barra ancha,
 *   recta desde el nodo angosto.
 * - Uno al lado del otro (se solapan en vertical): igual, en horizontal.
 * - En diagonal (no se solapan en ningún eje): flecha en "L", sale por arriba/abajo
 *   y entra por el costado. Así los retornos de un bucle no pisan la flecha principal.
 */
export function floatingEndpoints(source: Rect, target: Rect): EdgeEndpoints {
  const horizontalGap = Math.max(target.x - (source.x + source.width), source.x - (target.x + target.width));
  const verticalGap = Math.max(target.y - (source.y + source.height), source.y - (target.y + target.height));
  const sourceCenter = centerOf(source);
  const targetCenter = centerOf(target);
  const goesDown = targetCenter.y >= sourceCenter.y;
  const goesRight = targetCenter.x >= sourceCenter.x;

  if (horizontalGap > 0 && verticalGap > 0) {
    return {
      sourceX: sourceCenter.x,
      sourceY: goesDown ? source.y + source.height : source.y,
      sourcePosition: goesDown ? Position.Bottom : Position.Top,
      targetX: goesRight ? target.x : target.x + target.width,
      targetY: targetCenter.y,
      targetPosition: goesRight ? Position.Left : Position.Right,
    };
  }

  if (horizontalGap > verticalGap) {
    const y = sharedCoordinate(source.y, source.height, target.y, target.height);
    return {
      sourceX: goesRight ? source.x + source.width : source.x,
      sourceY: y ?? sourceCenter.y,
      sourcePosition: goesRight ? Position.Right : Position.Left,
      targetX: goesRight ? target.x : target.x + target.width,
      targetY: y ?? targetCenter.y,
      targetPosition: goesRight ? Position.Left : Position.Right,
    };
  }

  const x = sharedCoordinate(source.x, source.width, target.x, target.width);
  return {
    sourceX: x ?? sourceCenter.x,
    sourceY: goesDown ? source.y + source.height : source.y,
    sourcePosition: goesDown ? Position.Bottom : Position.Top,
    targetX: x ?? targetCenter.x,
    targetY: goesDown ? target.y : target.y + target.height,
    targetPosition: goesDown ? Position.Top : Position.Bottom,
  };
}

/** Un nodo cuenta como barra (fork, join) frente a otro si es al menos este tanto más ancho. */
const BAR_RATIO = 2;

/**
 * Coordenada común para una flecha recta hacia una barra: el centro del nodo
 * angosto, ajustado al tramo compartido. Así de una barra de fork ancha sale una
 * línea recta hacia cada acción, no todas desde su centro. Entre nodos de tamaño
 * parecido devuelve null: cada extremo va al centro de su nodo, para que la punta
 * no llegue corrida (p. ej. a un nodo final redondo).
 */
function sharedCoordinate(startA: number, sizeA: number, startB: number, sizeB: number): number | null {
  if (Math.max(sizeA, sizeB) < BAR_RATIO * Math.min(sizeA, sizeB)) return null;
  const overlapStart = Math.max(startA, startB);
  const overlapEnd = Math.min(startA + sizeA, startB + sizeB);
  const narrowerCenter = sizeA <= sizeB ? startA + sizeA / 2 : startB + sizeB / 2;
  if (overlapStart > overlapEnd) return narrowerCenter;
  return Math.min(Math.max(narrowerCenter, overlapStart), overlapEnd);
}

function centerOf(rect: Rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}
