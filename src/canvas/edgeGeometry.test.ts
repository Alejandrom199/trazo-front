import { Position } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { floatingEndpoints } from './edgeGeometry';

const action = (x: number, y: number) => ({ x, y, width: 140, height: 60 });

describe('floatingEndpoints', () => {
  it('Dado un nodo debajo de otro, Entonces la flecha es vertical y recta', () => {
    const result = floatingEndpoints(action(0, 0), action(0, 200));

    expect(result).toMatchObject({ sourcePosition: Position.Bottom, targetPosition: Position.Top });
    expect(result.sourceX).toBe(result.targetX);
  });

  it('Dado un nodo debajo de otro pero algo corrido, Entonces cada extremo va al centro de su nodo', () => {
    const result = floatingEndpoints(action(0, 0), action(20, 200));

    expect(result.sourceX).toBe(70);
    expect(result.targetX).toBe(90);
  });

  it('Dado un nodo final redondo algo corrido bajo el inicial, Entonces la punta llega a su centro', () => {
    const initial = { x: 0, y: 0, width: 30, height: 30 };
    const final = { x: 12, y: 150, width: 32, height: 32 };

    expect(floatingEndpoints(initial, final)).toMatchObject({ sourceX: 15, targetX: 28 });
  });

  it('Dados dos nodos en la misma fila, Entonces la flecha es horizontal y recta', () => {
    const result = floatingEndpoints(action(300, 0), action(0, 0));

    expect(result).toMatchObject({ sourcePosition: Position.Left, targetPosition: Position.Right });
    expect(result.sourceY).toBe(result.targetY);
  });

  it('Dados dos nodos en diagonal, Entonces la flecha forma una L (sale vertical, entra lateral)', () => {
    const result = floatingEndpoints(action(400, 400), action(0, 0));

    expect(result).toMatchObject({ sourcePosition: Position.Top, targetPosition: Position.Right });
  });

  it('Dada una barra ancha y una acción debajo de su extremo, Entonces la línea baja recta por el centro de la acción', () => {
    const bar = { x: 0, y: 0, width: 560, height: 8 };

    const result = floatingEndpoints(bar, action(10, 100));

    expect(result.sourceX).toBe(80);
    expect(result.targetX).toBe(80);
  });
});
