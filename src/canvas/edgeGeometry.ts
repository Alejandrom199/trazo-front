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
 * se calcula en cada dibujo según dónde están los nodos. Si están más separados
 * en horizontal se unen por los costados; si no, por arriba/abajo.
 */
export function floatingEndpoints(source: Rect, target: Rect): EdgeEndpoints {
  const horizontalGap = Math.max(target.x - (source.x + source.width), source.x - (target.x + target.width));
  const verticalGap = Math.max(target.y - (source.y + source.height), source.y - (target.y + target.height));

  const sourceCenter = centerOf(source);
  const targetCenter = centerOf(target);

  if (horizontalGap > verticalGap) {
    const goesRight = targetCenter.x >= sourceCenter.x;
    return {
      sourceX: goesRight ? source.x + source.width : source.x,
      sourceY: sourceCenter.y,
      sourcePosition: goesRight ? Position.Right : Position.Left,
      targetX: goesRight ? target.x : target.x + target.width,
      targetY: targetCenter.y,
      targetPosition: goesRight ? Position.Left : Position.Right,
    };
  }

  const goesDown = targetCenter.y >= sourceCenter.y;
  return {
    sourceX: sourceCenter.x,
    sourceY: goesDown ? source.y + source.height : source.y,
    sourcePosition: goesDown ? Position.Bottom : Position.Top,
    targetX: targetCenter.x,
    targetY: goesDown ? target.y : target.y + target.height,
    targetPosition: goesDown ? Position.Top : Position.Bottom,
  };
}

function centerOf(rect: Rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}
