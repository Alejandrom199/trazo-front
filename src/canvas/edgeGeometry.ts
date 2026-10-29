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
 * - Uno encima del otro (se solapan en horizontal): flecha vertical recta.
 * - Uno al lado del otro (se solapan en vertical): flecha horizontal recta.
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
      sourceY: y,
      sourcePosition: goesRight ? Position.Right : Position.Left,
      targetX: goesRight ? target.x : target.x + target.width,
      targetY: y,
      targetPosition: goesRight ? Position.Left : Position.Right,
    };
  }

  const x = sharedCoordinate(source.x, source.width, target.x, target.width);
  return {
    sourceX: x,
    sourceY: goesDown ? source.y + source.height : source.y,
    sourcePosition: goesDown ? Position.Bottom : Position.Top,
    targetX: x,
    targetY: goesDown ? target.y : target.y + target.height,
    targetPosition: goesDown ? Position.Top : Position.Bottom,
  };
}

/**
 * Coordenada común para una flecha recta entre dos nodos que se solapan en un eje:
 * el centro del más estrecho, ajustado al tramo compartido. Así de una barra de
 * fork ancha sale una línea recta hacia cada acción, no todas desde su centro.
 */
function sharedCoordinate(startA: number, sizeA: number, startB: number, sizeB: number): number {
  const overlapStart = Math.max(startA, startB);
  const overlapEnd = Math.min(startA + sizeA, startB + sizeB);
  const narrowerCenter = sizeA <= sizeB ? startA + sizeA / 2 : startB + sizeB / 2;
  if (overlapStart > overlapEnd) return narrowerCenter;
  return Math.min(Math.max(narrowerCenter, overlapStart), overlapEnd);
}

function centerOf(rect: Rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}
