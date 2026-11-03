import type { Position } from '@/core/model';
import type { Rect } from './edgeGeometry';

/**
 * Guías al arrastrar: cuando un borde o el centro del nodo que se mueve queda
 * cerca del de otro nodo, se ajusta a él y se dibuja una línea que los une.
 * Función pura: recibe rectángulos absolutos y devuelve la posición ajustada.
 */

export interface Guide {
  orientation: 'vertical' | 'horizontal';
  /** x de una guía vertical, o y de una horizontal. */
  at: number;
  /** Extremos de la línea (y en una vertical, x en una horizontal). */
  from: number;
  to: number;
}

export interface GuideSnap {
  position: Position;
  guides: Guide[];
}

/** Distancia (en unidades del lienzo) a la que una línea «atrae» al nodo. */
export const GUIDE_THRESHOLD = 6;

/** Bordes y centro de un rectángulo en un eje: [inicio, centro, fin]. */
const linesX = (rect: Rect) => [rect.x, rect.x + rect.width / 2, rect.x + rect.width];
const linesY = (rect: Rect) => [rect.y, rect.y + rect.height / 2, rect.y + rect.height];

export function snapToGuides(moving: Rect, others: Rect[], threshold = GUIDE_THRESHOLD): GuideSnap {
  const dx = closestOffset(linesX(moving), others.flatMap(linesX), threshold);
  const dy = closestOffset(linesY(moving), others.flatMap(linesY), threshold);
  const snapped: Rect = { ...moving, x: moving.x + (dx ?? 0), y: moving.y + (dy ?? 0) };

  const guides: Guide[] = [];
  if (dx !== null) {
    for (const x of linesX(snapped)) {
      const matches = others.filter((other) => linesX(other).some((line) => near(line, x)));
      if (matches.length === 0) continue;
      const all = [snapped, ...matches];
      guides.push({ orientation: 'vertical', at: x, from: Math.min(...all.map((r) => r.y)), to: Math.max(...all.map((r) => r.y + r.height)) });
    }
  }
  if (dy !== null) {
    for (const y of linesY(snapped)) {
      const matches = others.filter((other) => linesY(other).some((line) => near(line, y)));
      if (matches.length === 0) continue;
      const all = [snapped, ...matches];
      guides.push({ orientation: 'horizontal', at: y, from: Math.min(...all.map((r) => r.x)), to: Math.max(...all.map((r) => r.x + r.width)) });
    }
  }
  return { position: { x: snapped.x, y: snapped.y }, guides };
}

/** El menor desplazamiento que hace coincidir una de las líneas propias con una ajena; null si ninguna está cerca. */
function closestOffset(own: number[], targets: number[], threshold: number): number | null {
  let best: number | null = null;
  for (const line of own) {
    for (const target of targets) {
      const offset = target - line;
      if (Math.abs(offset) <= threshold && (best === null || Math.abs(offset) < Math.abs(best))) best = offset;
    }
  }
  return best;
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.5;
