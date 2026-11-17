/**
 * Cómo mostrar unos elementos resaltados moviendo la vista lo menos posible.
 *
 * Reglas, en orden:
 * - Si ya se ven enteros (dentro de los márgenes), la vista no se mueve.
 * - Si caben con el zoom actual, solo se desplaza para centrarlos: no cambia el zoom.
 * - Si no caben, se aleja justo lo necesario (nunca se acerca más que el zoom actual).
 * Así el recorrido paso a paso o un problema resaltado no hacen saltar el lienzo.
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

/** Espacio libre en pantalla que se respeta por cada lado (barras sobre el lienzo). */
export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const MIN_ZOOM = 0.1;

/** Caja que encierra todas las cajas, o null si no hay ninguna. */
export function boundingBox(boxes: readonly Box[]): Box | null {
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * La vista nueva para que `box` (coordenadas del diagrama) quede visible en un
 * lienzo de `size` píxeles, o null si ya se ve y no hay que moverla.
 */
export function revealViewport(box: Box, viewport: ViewportState, size: { width: number; height: number }, margins: Margins): ViewportState | null {
  const room = { width: size.width - margins.left - margins.right, height: size.height - margins.top - margins.bottom };
  if (room.width <= 0 || room.height <= 0) return null;

  const screenLeft = box.x * viewport.zoom + viewport.x;
  const screenTop = box.y * viewport.zoom + viewport.y;
  const visible =
    screenLeft >= margins.left &&
    screenTop >= margins.top &&
    screenLeft + box.width * viewport.zoom <= size.width - margins.right &&
    screenTop + box.height * viewport.zoom <= size.height - margins.bottom;
  if (visible) return null;

  const fitting = Math.min(room.width / Math.max(box.width, 1), room.height / Math.max(box.height, 1));
  const zoom = Math.max(MIN_ZOOM, Math.min(viewport.zoom, fitting));
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  return {
    x: margins.left + room.width / 2 - center.x * zoom,
    y: margins.top + room.height / 2 - center.y * zoom,
    zoom,
  };
}
