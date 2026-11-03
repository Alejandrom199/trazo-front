import { describe, expect, it } from 'vitest';
import { snapToGuides } from './alignmentGuides';

const rect = (x: number, y: number, width = 100, height = 50) => ({ x, y, width, height });

describe('snapToGuides', () => {
  it('Dado un nodo casi alineado por la izquierda con otro, Entonces se ajusta y muestra una guía vertical', () => {
    const result = snapToGuides(rect(4, 200), [rect(0, 0)]);

    expect(result.position).toEqual({ x: 0, y: 200 });
    expect(result.guides).toContainEqual({ orientation: 'vertical', at: 0, from: 0, to: 250 });
  });

  it('Dado un nodo casi centrado en vertical con otro de distinto tamaño, Entonces alinea los centros', () => {
    const result = snapToGuides(rect(300, 13, 100, 30), [rect(0, 0, 100, 60)]);

    expect(result.position.y).toBe(15);
    expect(result.guides.some((guide) => guide.orientation === 'horizontal' && guide.at === 30)).toBe(true);
  });

  it('Dado un nodo lejos de toda línea, Entonces no se mueve ni hay guías', () => {
    expect(snapToGuides(rect(57, 333), [rect(0, 0)])).toEqual({ position: { x: 57, y: 333 }, guides: [] });
  });
});
