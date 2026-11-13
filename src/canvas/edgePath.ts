import { getBezierPath, getSmoothStepPath, Position as Side } from '@xyflow/react';
import type { EdgeRouting, LineStyle, Position } from '@/core/model';
import { floatingEndpoints, type Rect } from './edgeGeometry';

/**
 * Trazado de una conexión entre dos nodos, según su modo y sus vértices.
 *   - ortogonal: tramos horizontales y verticales con esquinas suaves.
 *   - recta: segmentos rectos de vértice en vértice.
 *   - curva: una curva suave (Catmull-Rom) que pasa por todos los vértices.
 * Los extremos "flotan": salen del borde del nodo que mira hacia el siguiente punto.
 */

export interface EdgePath {
  /** Atributo `d` del SVG. */
  d: string;
  /** Dónde va la etiqueta (la guarda): a mitad del recorrido. */
  label: Position;
  /** Extremos y vértices en orden; sirven para dibujar los tiradores de edición. */
  controlPoints: Position[];
  /**
   * Recorrido aproximado (polilínea) de cada tramo entre puntos de control. Al
   * arrastrar la línea sobre el tramo i, el vértice nuevo se inserta en la posición i.
   */
  legs: Position[][];
}

const CORNER_RADIUS = 10;
const ORTHOGONAL_OFFSET = 18;
/** Muestras por tramo curvo para aproximarlo con una polilínea. */
const CURVE_SAMPLES = 16;

type Axis = 'h' | 'v';
type Anchor = { point: Position; axis: Axis };

export function buildEdgePath(source: Rect, target: Rect, routing: EdgeRouting, waypoints: Position[]): EdgePath {
  if (waypoints.length === 0 && routing !== 'straight') return buildWithoutWaypoints(source, target, routing);

  const first = waypoints[0] ?? centerOf(target);
  const last = waypoints.at(-1) ?? centerOf(source);

  if (routing === 'orthogonal') {
    const start = sideAnchor(source, first);
    const end = sideAnchor(target, last);
    const legs = orthogonalLegs(start, waypoints, end);
    const points = withoutRedundantPoints(legs.flat());
    return {
      d: roundedPolylinePath(points, CORNER_RADIUS),
      label: pointAtHalf(points),
      controlPoints: [start.point, ...waypoints, end.point],
      legs,
    };
  }

  const start = boundaryPoint(source, first);
  const end = boundaryPoint(target, last);
  const points = [start, ...waypoints, end];
  if (routing === 'curved') {
    const segments = catmullRomSegments(points);
    return {
      d: curvePath(start, segments),
      label: pointAtHalf(points),
      controlPoints: points,
      legs: segments.map(sampleBezier),
    };
  }
  return {
    d: polylinePath(points),
    label: pointAtHalf(points),
    controlPoints: points,
    legs: points.slice(1).map((point, index) => [points[index]!, point]),
  };
}

/** Sin vértices: ortogonal "flotante" de siempre, o una curva suave entre los lados que se miran. */
function buildWithoutWaypoints(source: Rect, target: Rect, routing: EdgeRouting): EdgePath {
  const endpoints = floatingEndpoints(source, target);
  const start = { x: endpoints.sourceX, y: endpoints.sourceY };
  const end = { x: endpoints.targetX, y: endpoints.targetY };
  const [d, labelX, labelY] =
    routing === 'curved'
      ? getBezierPath(endpoints)
      : getSmoothStepPath({ ...endpoints, borderRadius: CORNER_RADIUS, offset: ORTHOGONAL_OFFSET });
  // Un solo tramo: cualquier punto de la línea inserta el primer vértice; basta con aproximarlo.
  const approximate =
    routing === 'curved'
      ? [start, end]
      : orthogonalLegs({ point: start, axis: axisOf(endpoints.sourcePosition) }, [], { point: end, axis: axisOf(endpoints.targetPosition) })[0]!;
  return {
    d,
    label: { x: labelX, y: labelY },
    controlPoints: [start, end],
    legs: [approximate],
  };
}

/** Patrón de trazo SVG de cada estilo de línea. */
export function dashArrayFor(style: LineStyle): string | undefined {
  switch (style) {
    case 'solid':
      return undefined;
    case 'dashed':
      return '6 4';
    case 'dotted':
      return '0.5 4';
  }
}

// ── Geometría ──────────────────────────────────────────────────────────────────

function centerOf(rect: Rect): Position {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function axisOf(side: Side): Axis {
  return side === Side.Left || side === Side.Right ? 'h' : 'v';
}

/** Punto del borde del rectángulo en la dirección de `toward` (desde su centro). */
export function boundaryPoint(rect: Rect, toward: Position): Position {
  const center = centerOf(rect);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (dx === 0 && dy === 0) return center;
  const scale = Math.min(
    dx === 0 ? Infinity : rect.width / 2 / Math.abs(dx),
    dy === 0 ? Infinity : rect.height / 2 / Math.abs(dy),
  );
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

/** Punto medio del lado que mira hacia `toward`, y si ese lado es horizontal o vertical. */
function sideAnchor(rect: Rect, toward: Position): Anchor {
  const center = centerOf(rect);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  // Se normaliza por el tamaño para que en nodos anchos (barras) gane el lado correcto.
  if (Math.abs(dx) / rect.width > Math.abs(dy) / rect.height) {
    return { point: { x: dx > 0 ? rect.x + rect.width : rect.x, y: center.y }, axis: 'h' };
  }
  return { point: { x: center.x, y: dy > 0 ? rect.y + rect.height : rect.y }, axis: 'v' };
}

/**
 * Recorrido ortogonal por los vértices, como un tramo por cada par de puntos de
 * control: sale perpendicular al lado de origen, dobla en cada vértice y entra
 * perpendicular al lado de destino.
 *
 * Cada tramo es una L que arranca por el eje de salida del origen y llega al vértice
 * por el otro eje; así el siguiente vuelve a arrancar perpendicular y cada vértice es
 * un codo visible. Si el destino pide entrar por el mismo eje con el que se salió
 * (p. ej. de abajo de un nodo a arriba de otro), el último tramo es una Z: con una L
 * la línea volvería sobre sí misma y el vértice quedaría fuera de ella.
 */
function orthogonalLegs(start: Anchor, waypoints: Position[], end: Anchor): Position[][] {
  const legs: Position[][] = [];
  let previous = start.point;
  for (const stop of waypoints) {
    legs.push(lLeg(previous, stop, start.axis));
    previous = stop;
  }
  legs.push(end.axis === start.axis ? zLeg(previous, end.point, start.axis) : lLeg(previous, end.point, start.axis));
  return legs;
}

/** Primero por el eje `first` y luego por el otro. */
function lLeg(from: Position, to: Position, first: Axis): Position[] {
  const corner = first === 'h' ? { x: to.x, y: from.y } : { x: from.x, y: to.y };
  return [from, corner, to];
}

/** Por `axis` hasta la mitad, cruza por el otro eje y termina otra vez por `axis`. */
function zLeg(from: Position, to: Position, axis: Axis): Position[] {
  if (axis === 'v') {
    const middle = (from.y + to.y) / 2;
    return [from, { x: from.x, y: middle }, { x: to.x, y: middle }, to];
  }
  const middle = (from.x + to.x) / 2;
  return [from, { x: middle, y: from.y }, { x: middle, y: to.y }, to];
}

/**
 * Quita puntos repetidos y los que están en medio de un tramo recto. Un punto
 * alineado donde la línea da la vuelta (ida y vuelta por el mismo eje) se conserva:
 * es un extremo del recorrido, no un punto intermedio.
 */
function withoutRedundantPoints(points: Position[]): Position[] {
  const distinct = points.filter((point, index) => index === 0 || !samePoint(point, points[index - 1]!));
  return distinct.filter((point, index) => {
    const previous = distinct[index - 1];
    const next = distinct[index + 1];
    if (!previous || !next) return true;
    const between = (a: number, b: number, c: number) => Math.min(a, c) <= b && b <= Math.max(a, c);
    const inVertical = previous.x === point.x && point.x === next.x && between(previous.y, point.y, next.y);
    const inHorizontal = previous.y === point.y && point.y === next.y && between(previous.x, point.x, next.x);
    return !inVertical && !inHorizontal;
  });
}

const samePoint = (a: Position, b: Position) => Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01;

function polylinePath(points: Position[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');
}

/** Polilínea con las esquinas redondeadas (sin pasarse de la mitad de cada tramo). */
function roundedPolylinePath(points: Position[], radius: number): string {
  if (points.length < 3) return polylinePath(points);
  let d = `M${points[0]!.x},${points[0]!.y}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = points[i - 1]!;
    const corner = points[i]!;
    const next = points[i + 1]!;
    const r = Math.min(radius, distance(previous, corner) / 2, distance(corner, next) / 2);
    const before = towards(corner, previous, r);
    const after = towards(corner, next, r);
    d += ` L${before.x},${before.y} Q${corner.x},${corner.y} ${after.x},${after.y}`;
  }
  const last = points.at(-1)!;
  return `${d} L${last.x},${last.y}`;
}

/** Un tramo Bézier cúbico: desde, control 1, control 2, hasta. */
type CubicSegment = [Position, Position, Position, Position];

/** Curva Catmull-Rom (pasa por todos los puntos) como tramos Bézier cúbicos. */
function catmullRomSegments(points: Position[]): CubicSegment[] {
  return points.slice(0, -1).map((p1, i) => {
    const p0 = points[i - 1] ?? p1;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    return [p1, c1, c2, p2];
  });
}

function curvePath(start: Position, segments: CubicSegment[]): string {
  return segments.reduce(
    (d, [, c1, c2, end]) => `${d} C${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`,
    `M${start.x},${start.y}`,
  );
}

/** Punto de un tramo Bézier cúbico en t ∈ [0, 1]. */
function bezierPoint([p0, p1, p2, p3]: CubicSegment, t: number): Position {
  const u = 1 - t;
  const blend = (a: number, b: number, c: number, d: number) => u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
  return { x: blend(p0.x, p1.x, p2.x, p3.x), y: blend(p0.y, p1.y, p2.y, p3.y) };
}

function sampleBezier(segment: CubicSegment): Position[] {
  return Array.from({ length: CURVE_SAMPLES + 1 }, (_, i) => bezierPoint(segment, i / CURVE_SAMPLES));
}

/**
 * Vértices de la flecha con uno nuevo en `point`, insertado en el tramo más cercano
 * a ese punto: así queda entre los dos puntos de control que lo rodean.
 */
export function insertWaypoint(path: EdgePath, waypoints: Position[], point: Position): { waypoints: Position[]; index: number } {
  const index = nearestLeg(path.legs, point);
  return { waypoints: [...waypoints.slice(0, index), point, ...waypoints.slice(index)], index };
}

function nearestLeg(legs: Position[][], point: Position): number {
  let best = 0;
  let bestDistance = Infinity;
  legs.forEach((leg, index) => {
    const legDistance = Math.min(...leg.slice(1).map((to, i) => distanceToSegment(point, leg[i]!, to)));
    if (legDistance < bestDistance) {
      best = index;
      bestDistance = legDistance;
    }
  });
  return best;
}

function distanceToSegment(point: Position, from: Position, to: Position): number {
  const length = distance(from, to);
  if (length === 0) return distance(point, from);
  const t = Math.max(0, Math.min(1, ((point.x - from.x) * (to.x - from.x) + (point.y - from.y) * (to.y - from.y)) / (length * length)));
  return distance(point, { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
}

function distance(a: Position, b: Position): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function towards(from: Position, to: Position, length: number): Position {
  const total = distance(from, to);
  if (total === 0) return from;
  return { x: from.x + ((to.x - from.x) / total) * length, y: from.y + ((to.y - from.y) / total) * length };
}

/** Punto a mitad del largo total de una polilínea. */
export function pointAtHalf(points: Position[]): Position {
  return pointAtFraction(points, 0.5);
}

/** Punto a una fracción (0 a 1) del largo total de una polilínea. */
export function pointAtFraction(points: Position[], fraction: number): Position {
  const lengths = points.slice(1).map((point, index) => distance(points[index]!, point));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) * fraction;
  for (let i = 0; i < lengths.length; i += 1) {
    const length = lengths[i]!;
    if (remaining <= length) return towards(points[i]!, points[i + 1]!, remaining);
    remaining -= length;
  }
  return points.at(-1) ?? { x: 0, y: 0 };
}
