import { describe, expect, it } from 'vitest';
import { buildHorizontalPath, SELF_LOOP_WIDTH } from './connectionPath';

const lifeline = (x: number) => ({ x, y: 0, width: 100, height: 400 });

describe('buildHorizontalPath', () => {
  it('Dado un mensaje hacia la derecha, Entonces va recto de línea central a línea central a su altura', () => {
    const path = buildHorizontalPath(lifeline(0), lifeline(300), 120, { self: false, sourceInset: 0, targetInset: 0 });

    expect(path.d).toBe('M50,120 L350,120');
    expect(path.label).toEqual({ x: 200, y: 120 });
    expect(path.legs).toEqual([]);
  });

  it('Dado un mensaje hacia la izquierda con activaciones, Entonces sale y llega a sus bordes', () => {
    const path = buildHorizontalPath(lifeline(300), lifeline(0), 120, { self: false, sourceInset: 7, targetInset: 7 });

    expect(path.d).toBe('M343,120 L57,120');
  });

  it('Dado un mensaje a sí mismo, Entonces sale a la derecha, baja y vuelve', () => {
    const path = buildHorizontalPath(lifeline(0), lifeline(0), 100, { self: true, sourceInset: 0, targetInset: 0 });

    expect(path.d).toBe(`M50,100 L${50 + SELF_LOOP_WIDTH},100 L${50 + SELF_LOOP_WIDTH},124 L50,124`);
  });
});
