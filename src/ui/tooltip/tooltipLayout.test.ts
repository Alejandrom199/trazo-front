import { describe, expect, it } from 'vitest';
import { placeTooltip, splitShortcut } from './tooltipLayout';

describe('splitShortcut', () => {
  it('Dado un texto con atajo al final, Entonces lo separa', () => {
    expect(splitShortcut('Deshacer (Ctrl+Z)')).toEqual({ label: 'Deshacer', shortcut: 'Ctrl+Z' });
    expect(splitShortcut('Ocultar artefactos (A)')).toEqual({ label: 'Ocultar artefactos', shortcut: 'A' });
  });

  it('Dado un paréntesis que no es un atajo, Entonces deja el texto como está', () => {
    expect(splitShortcut('Buscar artefacto (también con clic derecho)')).toEqual({ label: 'Buscar artefacto (también con clic derecho)', shortcut: null });
  });
});

describe('placeTooltip', () => {
  const viewport = { width: 800, height: 600 };
  const size = { width: 100, height: 30 };

  it('Dado espacio abajo, Entonces va debajo y centrado', () => {
    expect(placeTooltip({ left: 200, top: 100, width: 40, height: 20 }, size, viewport)).toEqual({ left: 170, top: 128 });
  });

  it('Dado un elemento al pie de la pantalla, Entonces va encima', () => {
    expect(placeTooltip({ left: 200, top: 570, width: 40, height: 20 }, size, viewport).top).toBe(532);
  });

  it('Dado un elemento en el borde izquierdo, Entonces no se sale de la pantalla', () => {
    expect(placeTooltip({ left: 0, top: 100, width: 20, height: 20 }, size, viewport).left).toBe(8);
  });
});
