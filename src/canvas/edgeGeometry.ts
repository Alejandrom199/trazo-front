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
 * - Uno encima del otro (se solapan en horizontal): flecha vertical recta, sin
 *   escalones aunque no estén alineados del todo (ver sharedCoordinate).
 * - Uno al lado del otro (se solapan en vertical): igual, en horizontal.
 * - En diagonal (no se solapan en ningún eje), flecha en "L":
 *   - hacia abajo: sale por el costado y entra por arriba. Así las ramas de una
 *     decisión se abren a izquierda y derecha en vez de compartir tramo.
 *   - hacia arriba (un retorno de bucle): sale por arriba y entra por el costado,
 *     para no pisar el flujo principal que baja.
 */
export function floatingEndpoints(source: Rect, target: Rect): EdgeEndpoints {
  const horizontalGap = Math.max(target.x - (source.x + source.width), source.x - (target.x + target.width));
  const verticalGap = Math.max(target.y - (source.y + source.height), source.y - (target.y + target.height));
  const sourceCenter = centerOf(source);
  const targetCenter = centerOf(target);
  const goesDown = targetCenter.y >= sourceCenter.y;
  const goesRight = targetCenter.x >= sourceCenter.x;

  if (horizontalGap > 0 && verticalGap > 0 && goesDown) {
    // En una barra ancha (join) se entra por el punto más cercano, no por su centro.
    const isBar = target.width >= BAR_RATIO * target.height;
    return {
      sourceX: goesRight ? source.x + source.width : source.x,
      sourceY: sourceCenter.y,
      sourcePosition: goesRight ? Position.Right : Position.Left,
      targetX: isBar ? clamp(sourceCenter.x, target.x, target.x + target.width) : targetCenter.x,
      targetY: target.y,
      targetPosition: Position.Top,
    };
  }

  if (horizontalGap > 0 && verticalGap > 0) {
    return {
      sourceX: sourceCenter.x,
      sourceY: source.y,
      sourcePosition: Position.Top,
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

/** Un nodo es una barra (fork, join) si es al menos este tanto más ancho que alto. */
const BAR_RATIO = 4;

/**
 * Coordenada de una flecha recta entre dos nodos que se solapan en un eje:
 *   1. el centro del destino, si cae dentro del origen: la punta llega centrada
 *      (p. ej. a un nodo final redondo) y de una barra de fork sale una línea
 *      recta hacia cada acción;
 *   2. si no, el centro del origen, si cae dentro del destino (p. ej. una acción
 *      que entra a un costado de una barra de join);
 *   3. si no, el centro del más angosto ajustado al tramo que comparten.
 */
function sharedCoordinate(sourceStart: number, sourceSize: number, targetStart: number, targetSize: number): number {
  const sourceCenter = sourceStart + sourceSize / 2;
  const targetCenter = targetStart + targetSize / 2;
  if (targetCenter >= sourceStart && targetCenter <= sourceStart + sourceSize) return targetCenter;
  if (sourceCenter >= targetStart && sourceCenter <= targetStart + targetSize) return sourceCenter;
  const narrowerCenter = sourceSize <= targetSize ? sourceCenter : targetCenter;
  return clamp(narrowerCenter, Math.max(sourceStart, targetStart), Math.min(sourceStart + sourceSize, targetStart + targetSize));
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function centerOf(rect: Rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}
