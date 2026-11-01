import type { Diagram, DiagramNode, Position } from './diagram';
import { absolutePosition } from './operations';

/**
 * Geometría entre contenedores vecinos (p. ej. carriles): el "imán" que los pega
 * al acercarlos y qué lados quedaron unidos (para dibujar rectas esas esquinas).
 * Solo cuentan los contenedores sueltos en el lienzo (sin padre).
 */

export interface JoinedSides {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export const NO_JOINED_SIDES: JoinedSides = { top: false, right: false, bottom: false, left: false };

/** Distancia (px) a la que un contenedor se pega a su vecino. */
export const CONTAINER_SNAP_DISTANCE = 16;

/** Tolerancia para considerar que dos bordes se tocan (redondeos de la posición). */
const TOUCH_TOLERANCE = 1;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function rectOf(diagram: Diagram, node: DiagramNode): Rect {
  return { ...absolutePosition(diagram, node), ...node.size };
}

function neighbors(diagram: Diagram, isContainer: (node: DiagramNode) => boolean, excludeId: string | null): Rect[] {
  return diagram.nodes
    .filter((node) => node.id !== excludeId && node.parentId === null && isContainer(node))
    .map((node) => rectOf(diagram, node));
}

const overlaps = (startA: number, sizeA: number, startB: number, sizeB: number) =>
  Math.min(startA + sizeA, startB + sizeB) - Math.max(startA, startB) > 0;

/**
 * Ajusta la posición propuesta de un contenedor para que se pegue al vecino más
 * cercano: costado con costado (y, si están casi alineados, también arriba con
 * arriba) o borde inferior con superior. Si nada queda a menos de
 * CONTAINER_SNAP_DISTANCE, devuelve la posición tal cual.
 */
export function snapContainerPosition(
  diagram: Diagram,
  movingId: string | null,
  proposed: Position,
  size: { width: number; height: number },
  isContainer: (node: DiagramNode) => boolean,
): Position {
  const others = neighbors(diagram, isContainer, movingId);
  let bestX: { delta: number; alignY: number } | null = null;
  let bestY: { delta: number; alignX: number } | null = null;

  for (const other of others) {
    const nearVertically = overlaps(proposed.y, size.height, other.y - CONTAINER_SNAP_DISTANCE, other.height + CONTAINER_SNAP_DISTANCE * 2);
    if (nearVertically) {
      for (const delta of [other.x + other.width - proposed.x, other.x - (proposed.x + size.width)]) {
        if (Math.abs(delta) <= CONTAINER_SNAP_DISTANCE && (!bestX || Math.abs(delta) < Math.abs(bestX.delta))) {
          bestX = { delta, alignY: other.y };
        }
      }
    }
    const nearHorizontally = overlaps(proposed.x, size.width, other.x - CONTAINER_SNAP_DISTANCE, other.width + CONTAINER_SNAP_DISTANCE * 2);
    if (nearHorizontally) {
      for (const delta of [other.y + other.height - proposed.y, other.y - (proposed.y + size.height)]) {
        if (Math.abs(delta) <= CONTAINER_SNAP_DISTANCE && (!bestY || Math.abs(delta) < Math.abs(bestY.delta))) {
          bestY = { delta, alignX: other.x };
        }
      }
    }
  }

  // Se prefiere unir por los costados (carriles verticales lado a lado).
  if (bestX) {
    const alignTop = Math.abs(bestX.alignY - proposed.y) <= CONTAINER_SNAP_DISTANCE;
    return { x: proposed.x + bestX.delta, y: alignTop ? bestX.alignY : proposed.y };
  }
  if (bestY) {
    const alignLeft = Math.abs(bestY.alignX - proposed.x) <= CONTAINER_SNAP_DISTANCE;
    return { x: alignLeft ? bestY.alignX : proposed.x, y: proposed.y + bestY.delta };
  }
  return proposed;
}

/** Qué lados de un contenedor tocan a otro contenedor (bordes pegados y tramo en común). */
export function joinedSides(diagram: Diagram, node: DiagramNode, isContainer: (node: DiagramNode) => boolean): JoinedSides {
  if (node.parentId !== null || !isContainer(node)) return NO_JOINED_SIDES;
  const self = rectOf(diagram, node);
  const touches = (a: number, b: number) => Math.abs(a - b) <= TOUCH_TOLERANCE;
  const sides = { ...NO_JOINED_SIDES };

  for (const other of neighbors(diagram, isContainer, node.id)) {
    const sharesVertical = overlaps(self.y, self.height, other.y, other.height);
    const sharesHorizontal = overlaps(self.x, self.width, other.x, other.width);
    if (sharesVertical && touches(other.x + other.width, self.x)) sides.left = true;
    if (sharesVertical && touches(self.x + self.width, other.x)) sides.right = true;
    if (sharesHorizontal && touches(other.y + other.height, self.y)) sides.top = true;
    if (sharesHorizontal && touches(self.y + self.height, other.y)) sides.bottom = true;
  }
  return sides;
}
