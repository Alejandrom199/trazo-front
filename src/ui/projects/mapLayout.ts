import { diagramsByPhase, MAP_PHASES, type Diagram, type MapEdge, type MapPhaseId } from '@/core/model';

/**
 * Geometría del mapa del proyecto (px del «mundo», antes del zoom). Las tarjetas
 * se acomodan solas: columna = fase, fila = orden del proyecto. Puro: misma
 * entrada, misma disposición.
 */
export const COLUMN_WIDTH = 300;
export const CARD_WIDTH = 220;
export const CARD_HEIGHT = 104;
export const ROW_GAP = 24;
/** Lugar arriba para la cabecera de la fase y para los arcos que saltan columnas. */
export const TOP = 150;
export const SIDE = 40;

export interface PlacedCard {
  diagram: Diagram;
  x: number;
  y: number;
  column: number;
}

export interface MapLayout {
  cards: Map<string, PlacedCard>;
  /** Diagramas por fase, en su orden. */
  phases: Map<MapPhaseId, Diagram[]>;
  width: number;
  height: number;
}

/** Borde izquierdo de la franja de una fase (las tarjetas van centradas en ella). */
export const columnLeft = (column: number) => SIDE + column * COLUMN_WIDTH;

export function layoutMap(diagrams: readonly Diagram[]): MapLayout {
  const phases = diagramsByPhase(diagrams);
  const cards = new Map<string, PlacedCard>();
  MAP_PHASES.forEach((phase, column) => {
    phases.get(phase.id)!.forEach((diagram, row) => {
      cards.set(diagram.id, { diagram, column, x: columnLeft(column) + (COLUMN_WIDTH - CARD_WIDTH) / 2, y: TOP + row * (CARD_HEIGHT + ROW_GAP) });
    });
  });
  const tallest = Math.max(1, ...MAP_PHASES.map((phase) => phases.get(phase.id)!.length));
  return {
    cards,
    phases,
    width: SIDE * 2 + MAP_PHASES.length * COLUMN_WIDTH,
    height: TOP + tallest * (CARD_HEIGHT + ROW_GAP) + 80,
  };
}

export interface ArrowGeometry {
  d: string;
  label: { x: number; y: number };
}

/**
 * Recorrido de una flecha entre dos tarjetas. Entre fases vecinas sale por un
 * costado y entra por el otro; si salta fases, pasa en arco por encima de las
 * tarjetas de en medio; en la misma fase, rodea por la derecha. `lane` separa
 * las flechas que unen el mismo par de diagramas.
 */
export function arrowBetween(from: PlacedCard, to: PlacedCard, lane: number): ArrowGeometry {
  const shift = lane * 12;
  const middle = (card: PlacedCard) => card.y + CARD_HEIGHT / 2 + shift;
  if (from.column === to.column) {
    const start = { x: from.x + CARD_WIDTH, y: middle(from) };
    const end = { x: to.x + CARD_WIDTH + 2, y: middle(to) };
    const bend = start.x + 44 + shift;
    return { d: `M${start.x},${start.y} C${bend},${start.y} ${bend},${end.y} ${end.x},${end.y}`, label: { x: bend - 8, y: (start.y + end.y) / 2 } };
  }
  if (Math.abs(to.column - from.column) > 1) {
    const start = { x: from.x + CARD_WIDTH / 2 + shift, y: from.y };
    const end = { x: to.x + CARD_WIDTH / 2 + shift, y: to.y - 2 };
    const apex = Math.min(start.y, end.y) - 60 - lane * 18;
    return { d: `M${start.x},${start.y} C${start.x},${apex} ${end.x},${apex} ${end.x},${end.y}`, label: { x: (start.x + end.x) / 2, y: apex + 15 } };
  }
  const forward = to.column > from.column;
  const start = { x: forward ? from.x + CARD_WIDTH : from.x, y: middle(from) };
  const end = { x: forward ? to.x - 2 : to.x + CARD_WIDTH + 2, y: middle(to) };
  const pull = Math.max(40, Math.abs(end.x - start.x) / 2);
  const direction = forward ? 1 : -1;
  return {
    d: `M${start.x},${start.y} C${start.x + pull * direction},${start.y} ${end.x - pull * direction},${end.y} ${end.x},${end.y}`,
    label: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
  };
}

/** Cuántas flechas hay antes que esta entre el mismo par de diagramas (en cualquier sentido). */
export function laneOf(edges: readonly MapEdge[], edge: MapEdge): number {
  const pair = (item: MapEdge) => [item.sourceId, item.targetId].sort().join('|');
  return edges.filter((item) => pair(item) === pair(edge)).indexOf(edge);
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 1.6;
const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/** Vista que encuadra todo el mapa en un área de `width` × `height`, sin pasar de 100 %. */
export function fitViewport(layout: Pick<MapLayout, 'width' | 'height'>, width: number, height: number): Viewport {
  const zoom = clampZoom(Math.min(1, (width - 32) / layout.width, (height - 32) / layout.height));
  return { zoom, x: Math.max(16, (width - layout.width * zoom) / 2), y: Math.max(16, (height - layout.height * zoom) / 2) };
}

/** Zoom hacia `zoom` manteniendo quieto el punto de pantalla `anchor` (p. ej. el puntero). */
export function zoomAround(view: Viewport, zoom: number, anchor: { x: number; y: number }): Viewport {
  const next = clampZoom(zoom);
  const worldX = (anchor.x - view.x) / view.zoom;
  const worldY = (anchor.y - view.y) / view.zoom;
  return { zoom: next, x: anchor.x - worldX * next, y: anchor.y - worldY * next };
}
