import { describe, expect, it } from 'vitest';
import { CANVAS_VIEW_ROLE_KEY, createEmptyDiagram, addNode, addEdge, DEFAULT_EDGE_SHAPE } from '@/core/model';
import { canvasPresentation } from './canvasView';

function diagram() {
  let value = createEmptyDiagram({ diagramType: 'activity', name: 'Vista' }, new Date(0));
  const node = (id: string, role: string) => ({ id, artifactType: 'action', label: id, position: { x: 0, y: 0 }, size: { width: 10, height: 10 }, parentId: null, props: { [CANVAS_VIEW_ROLE_KEY]: role }, notes: '', locked: false });
  value = addNode(value, node('principal', 'primary'));
  value = addNode(value, node('alternativa', 'alternative'));
  value = addNode(value, node('externo', 'integration'));
  value = addEdge(value, { id: 'e1', artifactType: 'controlFlow', sourceId: 'principal', targetId: 'alternativa', guard: null, label: '', ...DEFAULT_EDGE_SHAPE, props: { [CANVAS_VIEW_ROLE_KEY]: 'alternative' } });
  return value;
}

describe('vistas del lienzo', () => {
  it('atenúa sin eliminar los elementos ajenos a la vista', () => {
    const result = canvasPresentation(diagram(), { nodeIds: [], edgeIds: [] }, 'alternative', false);
    expect(result.dimmedNodeIds.has('externo')).toBe(true);
    expect(result.dimmedNodeIds.has('alternativa')).toBe(false);
  });

  it('el foco conserva la selección y su vecindad inmediata', () => {
    const result = canvasPresentation(diagram(), { nodeIds: ['principal'], edgeIds: [] }, 'all', true);
    expect(result.dimmedNodeIds.has('alternativa')).toBe(false);
    expect(result.dimmedNodeIds.has('externo')).toBe(true);
  });
});
