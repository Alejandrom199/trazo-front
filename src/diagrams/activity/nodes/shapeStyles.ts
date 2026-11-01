/**
 * Colores de las figuras como variables CSS: cambian solos con el tema claro/oscuro.
 * En SVG deben ir en `style` (los atributos fill/stroke no entienden var()).
 */
export const STROKE = 'var(--color-shape-stroke)';
export const STROKE_SELECTED = 'var(--color-accent)';
export const SHAPE_FILL = 'var(--color-shape-fill)';
export const MUTED_STROKE = 'var(--color-shape-muted)';
export const NOTE_FILL = 'var(--color-note-fill)';
export const STROKE_WIDTH = 1.5;

export function strokeFor(selected: boolean): string {
  return selected ? STROKE_SELECTED : STROKE;
}

/** Texto centrado dentro de una figura. */
export const centeredLabelClass =
  'absolute inset-0 flex items-center justify-center px-3 text-center text-[13px] leading-snug text-ink-900';
