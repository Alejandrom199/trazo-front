/** Colores de trazo compartidos por las figuras. Seleccionado = acento. */
export const STROKE = '#27272a';
export const STROKE_SELECTED = '#4f46e5';
export const STROKE_WIDTH = 1.5;

export function strokeFor(selected: boolean): string {
  return selected ? STROKE_SELECTED : STROKE;
}

/** Texto centrado dentro de una figura. */
export const centeredLabelClass =
  'absolute inset-0 flex items-center justify-center px-3 text-center text-[13px] leading-snug text-ink-900';
