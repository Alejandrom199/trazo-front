import { describe, expect, it } from 'vitest';
import { moveDiagramInOrder, withoutDiagrams, type TraceLink } from './project';

const link = (id: string, from: string, to: string): TraceLink => ({
  id,
  source: { diagramId: from, elementId: 'x', kind: 'node' },
  target: { diagramId: to, elementId: 'y', kind: 'node' },
  relation: 'detalla',
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('withoutDiagrams', () => {
  const project = { diagramIds: ['a', 'b', 'c'], traceLinks: [link('ab', 'a', 'b'), link('bc', 'b', 'c'), link('ca', 'c', 'a')] };

  it('Dado un diagrama quitado, Entonces se van él y los vínculos que lo tocan, por cualquier extremo', () => {
    expect(withoutDiagrams(project, new Set(['b']))).toEqual({ diagramIds: ['a', 'c'], traceLinks: [link('ca', 'c', 'a')] });
  });

  it('Dados ids que no son del proyecto, Entonces no hay nada que quitar', () => {
    expect(withoutDiagrams(project, new Set(['z']))).toBeNull();
    expect(withoutDiagrams(project, new Set())).toBeNull();
  });
});

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
