import { describe, expect, it } from 'vitest';
import { boundingBox, revealViewport } from './revealViewport';

const size = { width: 800, height: 600 };
const margins = { top: 50, right: 20, bottom: 50, left: 20 };

describe('mostrar lo resaltado sin mover de más', () => {
  it('Dados elementos que ya se ven, Entonces la vista no se mueve', () => {
    expect(revealViewport({ x: 100, y: 100, width: 100, height: 50 }, { x: 0, y: 0, zoom: 1 }, size, margins)).toBeNull();
  });

  it('Dados elementos fuera de la vista que caben, Entonces solo se desplaza y conserva el zoom', () => {
    const next = revealViewport({ x: 2000, y: 100, width: 100, height: 50 }, { x: 0, y: 0, zoom: 1.5 }, size, margins);
    expect(next?.zoom).toBe(1.5);
    // El centro de la caja queda en el centro del espacio libre.
    expect(next!.x + 2050 * 1.5).toBeCloseTo(20 + 760 / 2);
    expect(next!.y + 125 * 1.5).toBeCloseTo(50 + 500 / 2);
  });

  it('Dados elementos que no caben, Entonces se aleja solo lo necesario', () => {
    const next = revealViewport({ x: 0, y: 0, width: 1520, height: 100 }, { x: 0, y: 0, zoom: 1 }, size, margins);
    expect(next?.zoom).toBeCloseTo(0.5);
  });

  it('Dadas varias cajas, Entonces las encierra a todas', () => {
    expect(boundingBox([{ x: 10, y: 20, width: 5, height: 5 }, { x: -5, y: 30, width: 10, height: 10 }])).toEqual({ x: -5, y: 20, width: 20, height: 20 });
    expect(boundingBox([])).toBeNull();
  });
});
