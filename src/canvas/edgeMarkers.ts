import type { Position } from '@/core/model';

/**
 * Rombo de agregación/composición en el origen de la flecha, igual que en la
 * paleta (EdgeFigure): la punta toca el nodo fuente y el cuerpo sigue la línea.
 * Se dibuja a mano porque los <marker> SVG de inicio quedan mal orientados o
 * escondidos dentro del nodo según el trazo.
 */
export function sourceDiamondPath(from: Position, toward: Position): string {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const alongX = dx / length;
  const alongY = dy / length;
  const sideX = -alongY;
  const sideY = alongX;
  // Diagonales parecidas a las de EdgeFigure (rombo legible en horizontal y vertical).
  const along = 11;
  const side = 7;
  const tip = from;
  const mid = { x: from.x + alongX * along, y: from.y + alongY * along };
  const far = { x: from.x + alongX * along * 2, y: from.y + alongY * along * 2 };
  const left = { x: mid.x + sideX * side, y: mid.y + sideY * side };
  const right = { x: mid.x - sideX * side, y: mid.y - sideY * side };
  return `M${tip.x} ${tip.y} L${left.x} ${left.y} L${far.x} ${far.y} L${right.x} ${right.y} Z`;
}
