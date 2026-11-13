import { describe, expect, it } from 'vitest';
import { moveDiagramInOrder } from './project';

describe('moveDiagramInOrder', () => {
  const order = ['a', 'b', 'c', 'd'];

  it('Dado un diagrama movido hacia abajo, Entonces queda en esa posición y el resto conserva su orden', () => {
    expect(moveDiagramInOrder(order, 'a', 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('Dado un diagrama movido hacia arriba, Entonces queda en esa posición', () => {
    expect(moveDiagramInOrder(order, 'd', 0)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('Dada una posición fuera de la lista, Entonces va al principio o al final', () => {
    expect(moveDiagramInOrder(order, 'b', 99)).toEqual(['a', 'c', 'd', 'b']);
    expect(moveDiagramInOrder(order, 'c', -3)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('Dado un diagrama que no es del proyecto, Entonces el orden no cambia', () => {
    expect(moveDiagramInOrder(order, 'x', 0)).toEqual(order);
  });
});
