import type { Diagram, DiagramNode, Position } from './diagram';
import { absolutePosition } from './operations';

/**
 * Geometría entre contenedores vecinos (p. ej. carriles): el "imán" que los pega
 * al acercarlos y cómo dibujar la unión. Solo cuentan los contenedores sueltos en
 * el lienzo (sin padre).
 */

export interface Sides {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export interface Corners {
  topLeft: boolean;
  topRight: boolean;
  bottomRight: boolean;
  bottomLeft: boolean;
}

/** Cómo toca un contenedor a sus vecinos. */
export interface ContainerJoints {
  /** Lados cubiertos de punta a punta por vecinos: su borde ya lo dibuja el vecino. */
  coveredSides: Sides;
  /** Esquinas a las que llega un vecino: se dibujan rectas para que la unión no tenga muescas. */
  squareCorners: Corners;
}

export const NO_JOINTS: ContainerJoints = {
  coveredSides: { top: false, right: false, bottom: false, left: false },
  squareCorners: { topLeft: false, topRight: false, bottomRight: false, bottomLeft: false },
};

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

/** ¿Los tramos [start, end) cubren por completo [from, to]? */
function covers(intervals: [number, number][], from: number, to: number): boolean {
  let reached = from;
  for (const [start, end] of [...intervals].sort((a, b) => a[0] - b[0])) {
    if (start > reached + TOUCH_TOLERANCE) return false;
    reached = Math.max(reached, end);
  }
  return reached >= to - TOUCH_TOLERANCE;
}

/**
 * Cómo toca un contenedor a sus vecinos. Un vecino puede tocar solo un tramo de un
 * lado (carriles desalineados): entonces ese lado conserva su borde y solo se
 * enderezan las esquinas a las que el vecino realmente llega.
 */
export function containerJoints(diagram: Diagram, node: DiagramNode, isContainer: (node: DiagramNode) => boolean): ContainerJoints {
  if (node.parentId !== null || !isContainer(node)) return NO_JOINTS;
  const self = rectOf(diagram, node);
  const right = self.x + self.width;
  const bottom = self.y + self.height;
  const touches = (a: number, b: number) => Math.abs(a - b) <= TOUCH_TOLERANCE;

  const along = { top: [] as [number, number][], right: [] as [number, number][], bottom: [] as [number, number][], left: [] as [number, number][] };
  for (const other of neighbors(diagram, isContainer, node.id)) {
    const otherRight = other.x + other.width;
    const otherBottom = other.y + other.height;
    if (overlaps(self.y, self.height, other.y, other.height)) {
      if (touches(otherRight, self.x)) along.left.push([other.y, otherBottom]);
      if (touches(right, other.x)) along.right.push([other.y, otherBottom]);
    }
    if (overlaps(self.x, self.width, other.x, other.width)) {
      if (touches(otherBottom, self.y)) along.top.push([other.x, otherRight]);
      if (touches(bottom, other.y)) along.bottom.push([other.x, otherRight]);
    }
  }

  /** ¿Algún tramo de ese lado llega hasta la coordenada de la esquina? */
  const reaches = (intervals: [number, number][], corner: number) =>
    intervals.some(([start, end]) => start <= corner + TOUCH_TOLERANCE && end >= corner - TOUCH_TOLERANCE);

  return {
    coveredSides: {
      top: covers(along.top, self.x, right),
      right: covers(along.right, self.y, bottom),
      bottom: covers(along.bottom, self.x, right),
      left: covers(along.left, self.y, bottom),
    },
    squareCorners: {
      topLeft: reaches(along.left, self.y) || reaches(along.top, self.x),
      topRight: reaches(along.right, self.y) || reaches(along.top, right),
      bottomRight: reaches(along.right, bottom) || reaches(along.bottom, right),
      bottomLeft: reaches(along.left, bottom) || reaches(along.bottom, self.x),
    },
  };
}
