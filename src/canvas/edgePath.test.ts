import { describe, expect, it } from 'vitest';
import { boundaryPoint, buildEdgePath, dashArrayFor, pointAtHalf } from './edgePath';

const box = (x: number, y: number) => ({ x, y, width: 100, height: 50 });

describe('buildEdgePath', () => {
  it('Dada una recta con un vértice, Entonces pasa por el vértice con dos segmentos', () => {
    const result = buildEdgePath(box(0, 0), box(300, 0), 'straight', [{ x: 150, y: 150 }]);

    expect(result.d.match(/L/g)).toHaveLength(2);
    expect(result.d).toContain('L150,150');
    expect(result.controlPoints).toHaveLength(3);
  });

  it('Dada una curva con vértices, Entonces usa tramos Bézier que terminan en cada punto', () => {
    const result = buildEdgePath(box(0, 0), box(300, 0), 'curved', [{ x: 150, y: 150 }]);

    expect(result.d.match(/C/g)).toHaveLength(2);
    expect(result.d).toContain(' 150,150');
  });

  it('Dada una ortogonal con un vértice, Entonces sus tramos son horizontales o verticales y pasa por el vértice', () => {
    const result = buildEdgePath(box(0, 0), box(300, 200), 'orthogonal', [{ x: 200, y: 100 }]);
    // Puntos de cada tramo: inicio de línea (M/L) y fin de cada esquina curva (Q).
    const points = [...result.d.matchAll(/(?:[ML]|Q-?[\d.]+,-?[\d.]+ )(-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
    const segments = points.slice(1).map((point, index) => [points[index]!, point] as const);

    // Cada tramo recto es horizontal o vertical...
    const straight = [...result.d.matchAll(/(-?[\d.]+),(-?[\d.]+) L(-?[\d.]+),(-?[\d.]+)/g)];
    for (const [, x1, y1, x2, y2] of straight) expect(x1 === x2 || y1 === y2).toBe(true);
    // ...y alguno pasa por el vértice (200, 100).
    const passes = segments.some(([a, b]) => a.y === 100 && b.y === 100 && Math.min(a.x, b.x) <= 200 && Math.max(a.x, b.x) >= 200);
    expect(passes).toBe(true);
  });

  it('Dada una flecha sin vértices, Entonces tiene dos puntos de control: sus extremos', () => {
    expect(buildEdgePath(box(0, 0), box(0, 200), 'orthogonal', []).controlPoints).toHaveLength(2);
    expect(buildEdgePath(box(0, 0), box(0, 200), 'curved', []).controlPoints).toHaveLength(2);
  });
});

describe('utilidades', () => {
  it('El extremo sale del borde del nodo en dirección al siguiente punto', () => {
    expect(boundaryPoint(box(0, 0), { x: 500, y: 25 })).toEqual({ x: 100, y: 25 });
    expect(boundaryPoint(box(0, 0), { x: 50, y: 500 })).toEqual({ x: 50, y: 50 });
  });

  it('La etiqueta va a mitad del recorrido', () => {
    expect(pointAtHalf([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }])).toEqual({ x: 100, y: 0 });
  });

  it('Cada estilo de línea tiene su patrón', () => {
    expect(dashArrayFor('solid')).toBeUndefined();
    expect(dashArrayFor('dashed')).toBe('6 4');
    expect(dashArrayFor('dotted')).toBe('0.5 4');
  });
});
