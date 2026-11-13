import { describe, expect, it } from 'vitest';
import { boundaryPoint, buildEdgePath, dashArrayFor, insertWaypoint, pointAtHalf } from './edgePath';

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
    // Cada tramo recto dibujado es horizontal o vertical...
    const straight = [...result.d.matchAll(/(-?[\d.]+),(-?[\d.]+) L(-?[\d.]+),(-?[\d.]+)/g)];
    for (const [, x1, y1, x2, y2] of straight) expect(x1 === x2 || y1 === y2).toBe(true);
    // ...y el recorrido dobla en el vértice (200, 100): la esquina redondeada lo roza, no lo toca.
    const route = result.legs.flatMap((leg, index) => (index === 0 ? leg : leg.slice(1)));
    expect(route).toContainEqual({ x: 200, y: 100 });
  });

  it('Dada una ortogonal de abajo de un nodo a arriba de otro con un vértice a un lado, Entonces la línea llega al vértice', () => {
    // Caso real: dos clases apiladas y un vértice arrastrado a la izquierda de la flecha.
    const upper = { x: 0, y: 0, width: 210, height: 150 };
    const lower = { x: 0, y: 320, width: 210, height: 150 };
    const vertex = { x: -40, y: 280 };
    const result = buildEdgePath(upper, lower, 'orthogonal', [vertex]);
    const route = result.legs.flatMap((leg, index) => (index === 0 ? leg : leg.slice(1)));

    expect(route).toContainEqual(vertex);
    expect(result.d).toContain('-40');
    // Todos los tramos son horizontales o verticales, y entra en vertical por arriba del de abajo.
    for (const [index, point] of route.slice(1).entries()) {
      const previous = route[index]!;
      expect(previous.x === point.x || previous.y === point.y).toBe(true);
    }
    expect(route.at(-2)!.x).toBe(route.at(-1)!.x);
    expect(route.at(-1)).toEqual({ x: 105, y: 320 });
  });

  it('Dada una flecha sin vértices, Entonces tiene dos puntos de control: sus extremos', () => {
    expect(buildEdgePath(box(0, 0), box(0, 200), 'orthogonal', []).controlPoints).toHaveLength(2);
    expect(buildEdgePath(box(0, 0), box(0, 200), 'curved', []).controlPoints).toHaveLength(2);
  });
});

describe('insertWaypoint', () => {
  it('Dada una recta sin vértices, Entonces el punto donde se agarra es el primer vértice', () => {
    const path = buildEdgePath(box(0, 0), box(300, 0), 'straight', []);

    expect(insertWaypoint(path, [], { x: 200, y: 40 })).toEqual({ waypoints: [{ x: 200, y: 40 }], index: 0 });
  });

  it('Dada una recta con dos vértices, Entonces el nuevo queda entre los puntos del tramo más cercano', () => {
    const waypoints = [{ x: 150, y: 150 }, { x: 300, y: 150 }];
    const path = buildEdgePath(box(0, 0), box(400, 0), 'straight', waypoints);

    // Sobre el tramo del medio (entre los dos vértices).
    expect(insertWaypoint(path, waypoints, { x: 220, y: 155 }).index).toBe(1);
    // Sobre el último tramo (del segundo vértice al destino).
    expect(insertWaypoint(path, waypoints, { x: 380, y: 60 }).index).toBe(2);
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
