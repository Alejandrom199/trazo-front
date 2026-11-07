import { describe, expect, it } from 'vitest';
import { sourceDiamondPath } from './edgeMarkers';

describe('sourceDiamondPath', () => {
  it('Dado un trazo horizontal, Entonces el rombo queda a lo largo de la línea', () => {
    const d = sourceDiamondPath({ x: 0, y: 0 }, { x: 100, y: 0 });
    expect(d).toContain('M0 0');
    // Extremo lejano sobre el eje X positivo.
    expect(d).toMatch(/L22 0/);
  });

  it('Dado un trazo vertical, Entonces el rombo sube con la línea', () => {
    const d = sourceDiamondPath({ x: 10, y: 100 }, { x: 10, y: 0 });
    expect(d).toContain('M10 100');
    expect(d).toMatch(/L10 78/);
  });
});
