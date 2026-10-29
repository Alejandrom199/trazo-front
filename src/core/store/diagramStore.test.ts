import { beforeEach, describe, expect, it } from 'vitest';
import type { DiagramNode } from '@/core/model';
import { useDiagramStore } from './diagramStore';

function node(id: string): DiagramNode {
  return {
    id,
    artifactType: 'action',
    label: id,
    position: { x: 0, y: 0 },
    size: { width: 100, height: 50 },
    parentId: null,
    props: {},
    notes: '',
  };
}

const store = () => useDiagramStore.getState();
const nodeIds = () => store().diagram?.nodes.map((n) => n.id);

describe('historial de deshacer/rehacer', () => {
  beforeEach(() => store().newDiagram({ diagramType: 'activity', name: 'test' }));

  it('Dado un nodo agregado, Entonces deshacer lo quita y rehacer lo devuelve', () => {
    store().addNode(node('a'));

    store().undo();
    expect(nodeIds()).toEqual([]);

    store().redo();
    expect(nodeIds()).toEqual(['a']);
  });

  it('Dado un arrastre (checkpoint + varios movimientos), Entonces se deshace en un solo paso', () => {
    store().addNode(node('a'));
    store().checkpoint();
    store().moveNodes([{ id: 'a', position: { x: 10, y: 0 } }]);
    store().moveNodes([{ id: 'a', position: { x: 20, y: 0 } }]);

    store().undo();

    expect(store().diagram?.nodes[0]?.position).toEqual({ x: 0, y: 0 });
  });

  it('Dado un cambio nuevo tras deshacer, Entonces ya no se puede rehacer', () => {
    store().addNode(node('a'));
    store().undo();

    store().addNode(node('b'));

    expect(store().future).toEqual([]);
  });

  it('Dada una etiqueta igual a la actual, Entonces no crea un paso de deshacer', () => {
    store().addNode(node('a'));
    const steps = store().past.length;

    store().setNodeLabel('a', 'a');

    expect(store().past).toHaveLength(steps);
  });

  it('Dado un diagrama nuevo, Entonces el historial empieza vacío', () => {
    store().addNode(node('a'));

    store().newDiagram({ diagramType: 'activity', name: 'otro' });

    expect(store().past).toEqual([]);
    expect(store().future).toEqual([]);
  });
});
