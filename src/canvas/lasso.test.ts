import { describe, expect, it } from 'vitest';
import { createEmptyDiagram, DEFAULT_EDGE_SHAPE, type Diagram, type DiagramNode } from '@/core/model';
import { isInside, lassoSelection } from './lasso';

const node = (id: string, x: number, y: number, artifactType = 'action', width = 100, height = 50): DiagramNode => ({
  id,
  artifactType,
  label: id,
  position: { x, y },
  size: { width, height },
  parentId: null,
  props: {},
  notes: '',
  locked: false,
});

const diagram: Diagram = {
  ...createEmptyDiagram({ diagramType: 'activity', name: 'x' }),
  nodes: [node('a', 0, 0), node('b', 0, 200), node('lejos', 600, 0), node('carril', -20, -20, 'partition', 400, 400)],
  edges: [
    { id: 'ab', artifactType: 'controlFlow', sourceId: 'a', targetId: 'b', guard: null, label: '', ...DEFAULT_EDGE_SHAPE, waypoints: [], props: {} },
    { id: 'a-lejos', artifactType: 'controlFlow', sourceId: 'a', targetId: 'lejos', guard: null, label: '', ...DEFAULT_EDGE_SHAPE, waypoints: [], props: {} },
  ],
};
const isContainer = (type: string) => type === 'partition';
const square = (x1: number, y1: number, x2: number, y2: number) => [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }];

describe('lassoSelection', () => {
  it('Dada un área alrededor de dos nodos, Entonces los selecciona con la flecha que los une, sin el carril que solo rozó', () => {
    expect(lassoSelection(diagram, square(-10, -10, 150, 300), isContainer)).toEqual({ nodeIds: ['a', 'b'], edgeIds: ['ab'] });
  });

  it('Dada un área que encierra el carril entero, Entonces también lo selecciona', () => {
    expect(lassoSelection(diagram, square(-50, -50, 450, 450), isContainer).nodeIds).toContain('carril');
  });

  it('Dado un trazo de menos de tres puntos, Entonces no selecciona nada', () => {
    expect(lassoSelection(diagram, [{ x: 0, y: 0 }, { x: 10, y: 10 }], isContainer)).toEqual({ nodeIds: [], edgeIds: [] });
  });
});

describe('isInside', () => {
  it('Dada una figura en L, Entonces el hueco de la L queda fuera', () => {
    const l = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 10 }, { x: 0, y: 10 }];
    expect(isInside({ x: 2, y: 8 }, l)).toBe(true);
    expect(isInside({ x: 8, y: 8 }, l)).toBe(false);
  });
});
