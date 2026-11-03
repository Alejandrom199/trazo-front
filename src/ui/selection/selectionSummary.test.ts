import { describe, expect, it } from 'vitest';
import { createEmptyDiagram, DEFAULT_EDGE_SHAPE, type Diagram, type DiagramNode } from '@/core/model';
import { commonValue, summarizeSelection } from './selectionSummary';

const node = (id: string, artifactType: string): DiagramNode => ({
  id,
  artifactType,
  label: id,
  position: { x: 0, y: 0 },
  size: { width: 100, height: 50 },
  parentId: null,
  props: {},
  notes: '',
  locked: false,
});

const diagram: Diagram = {
  ...createEmptyDiagram({ diagramType: 'activity', name: 'x' }),
  nodes: [node('a', 'action'), node('b', 'action'), node('d', 'decision')],
  edges: [{ id: 'ab', artifactType: 'controlFlow', sourceId: 'a', targetId: 'b', guard: null, label: '', ...DEFAULT_EDGE_SHAPE, waypoints: [], props: {} }],
};

describe('summarizeSelection', () => {
  it('Dados elementos del mismo tipo, Entonces hay un solo grupo y se pueden editar juntos', () => {
    const summary = summarizeSelection(diagram, { nodeIds: ['a', 'b'], edgeIds: [] });

    expect(summary.groups).toHaveLength(1);
    expect(summary.sameType).toMatchObject({ kind: 'node', artifactType: 'action' });
  });

  it('Dados artefactos distintos, Entonces se agrupan por tipo y no hay tipo común', () => {
    const summary = summarizeSelection(diagram, { nodeIds: ['a', 'd', 'b'], edgeIds: ['ab'] });

    expect(summary.groups.map((group) => [group.artifactType, group.elements.length])).toEqual([
      ['action', 2],
      ['decision', 1],
      ['controlFlow', 1],
    ]);
    expect(summary.sameType).toBeNull();
  });
});

describe('commonValue', () => {
  it('Dados valores iguales, Entonces devuelve ese valor; si difieren, null', () => {
    expect(commonValue([{ width: 10 }, { width: 10 }])).toEqual({ width: 10 });
    expect(commonValue([1, 2])).toBeNull();
    expect(commonValue([])).toBeNull();
  });
});
