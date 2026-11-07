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

  it('Dado un nodo debajo de otro pero algo corrido, Entonces la flecha va recta al centro del destino, sin escalón', () => {
    const result = floatingEndpoints(action(0, 0), action(20, 200));

    expect(result.sourceX).toBe(90);
    expect(result.targetX).toBe(90);
  });

  it('Dadas dos ramas hacia abajo en diagonal, Entonces salen por costados opuestos y entran por arriba', () => {
    const decision = { x: 100, y: 0, width: 44, height: 44 };
    const left = floatingEndpoints(decision, action(-100, 150));
    const right = floatingEndpoints(decision, action(250, 150));

    expect(left).toMatchObject({ sourcePosition: Position.Left, targetPosition: Position.Top, sourceX: 100 });
    expect(right).toMatchObject({ sourcePosition: Position.Right, targetPosition: Position.Top, sourceX: 144 });
  });

  it('Dado un nodo final redondo algo corrido bajo el inicial, Entonces la punta llega a su centro', () => {
    const initial = { x: 0, y: 0, width: 30, height: 30 };
    const final = { x: 12, y: 150, width: 32, height: 32 };

    expect(floatingEndpoints(initial, final)).toMatchObject({ sourceX: 28, targetX: 28 });
  });

  it('Dado un nodo inicial redondo a la derecha de una acción más alta, Entonces la línea sale por su centro y no lo roza', () => {
    const initial = { x: 300, y: 0, width: 30, height: 30 };
    const box = { x: 0, y: 0, width: 140, height: 60 };

    const result = floatingEndpoints(initial, box);

    expect(result.sourceY).toBe(15);
    expect(result.targetY).toBe(15);
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
