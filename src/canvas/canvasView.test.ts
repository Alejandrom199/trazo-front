import { describe, expect, it } from 'vitest';
import { addEdge, addNode, createEmptyDiagram, DEFAULT_EDGE_SHAPE } from '@/core/model';
import { canvasPresentation } from './canvasView';

function diagram() {
  let value = createEmptyDiagram({ diagramType: 'activity', name: 'Vista' }, new Date(0));
  const node = (id: string) => ({ id, artifactType: 'action', label: id, position: { x: 0, y: 0 }, size: { width: 10, height: 10 }, parentId: null, props: {}, notes: '', locked: false });
  value = addNode(value, node('a'));
  value = addNode(value, node('b'));
  value = addNode(value, node('lejos'));
  value = addEdge(value, { id: 'ab', artifactType: 'controlFlow', sourceId: 'a', targetId: 'b', guard: null, label: '', ...DEFAULT_EDGE_SHAPE, waypoints: [], props: {} });
  return value;
}

describe('enfocar selección', () => {
  it('Dado el foco sobre un nodo, Entonces conserva su vecindad inmediata y atenúa el resto', () => {
    const result = canvasPresentation(diagram(), { nodeIds: ['a'], edgeIds: [] }, true);

    expect(result.dimmedNodeIds.has('b')).toBe(false);
    expect(result.dimmedEdgeIds.has('ab')).toBe(false);
    expect(result.dimmedNodeIds.has('lejos')).toBe(true);
  });

  it('Dado el foco apagado o sin selección, Entonces no atenúa nada', () => {
    expect(canvasPresentation(diagram(), { nodeIds: ['a'], edgeIds: [] }, false).dimmedNodeIds.size).toBe(0);
    expect(canvasPresentation(diagram(), { nodeIds: [], edgeIds: [] }, true).dimmedNodeIds.size).toBe(0);
  });
});
