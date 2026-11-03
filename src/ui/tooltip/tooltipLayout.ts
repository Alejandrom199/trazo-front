/**
 * Partes puras del tooltip: separar el atajo del texto y decidir dónde se dibuja.
 */

/** Un atajo al final del texto, entre paréntesis: «Deshacer (Ctrl+Z)», «Ocultar artefactos (A)». */
const SHORTCUT = /^(.*\S)\s*\(((?:Ctrl|Shift|Alt|Supr|Esc|Enter|Tab|[A-Z0-9]|[↑↓←→\[\]])(?:\s*\+\s*(?:Ctrl|Shift|Alt|[A-Z0-9]|[↑↓←→\[\]]))*)\)$/;

export function splitShortcut(text: string): { label: string; shortcut: string | null } {
  const match = SHORTCUT.exec(text.trim());
  return match ? { label: match[1]!, shortcut: match[2]! } : { label: text.trim(), shortcut: null };
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Separación entre el elemento y el tooltip, y margen mínimo con el borde de la pantalla. */
const GAP = 8;
const MARGIN = 8;

/** Debajo del elemento y centrado; si no cabe abajo, encima. Nunca se sale de la pantalla. */
export function placeTooltip(anchor: Box, size: { width: number; height: number }, viewport: { width: number; height: number }): { left: number; top: number } {
  const below = anchor.top + anchor.height + GAP;
  const top = below + size.height <= viewport.height - MARGIN ? below : Math.max(MARGIN, anchor.top - GAP - size.height);
  const centered = anchor.left + anchor.width / 2 - size.width / 2;
  const left = Math.min(Math.max(MARGIN, centered), viewport.width - MARGIN - size.width);
  return { left, top };
}
