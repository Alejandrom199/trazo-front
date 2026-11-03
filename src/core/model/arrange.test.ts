import { describe, expect, it } from 'vitest';
import { alignNodes, distributeNodes } from './arrange';
import { createEmptyDiagram } from './factories';
import type { Diagram, DiagramNode } from './diagram';

const node = (id: string, x: number, y: number, extra: Partial<DiagramNode> = {}): DiagramNode => ({
  id,
  artifactType: 'action',
  label: id,
  position: { x, y },
  size: { width: 100, height: 50 },
  parentId: null,
  props: {},
  notes: '',
  locked: false,
  ...extra,
});

const diagram = (nodes: DiagramNode[]): Diagram => ({ ...createEmptyDiagram({ diagramType: 'activity', name: 'x' }), nodes });

describe('alignNodes', () => {
  it('Dados nodos desalineados, Entonces «izquierda» los lleva al borde más a la izquierda', () => {
    const result = alignNodes(diagram([node('a', 10, 0), node('b', 40, 100)]), ['a', 'b'], 'left');
    expect(result).toEqual([
      { id: 'a', position: { x: 10, y: 0 } },
      { id: 'b', position: { x: 10, y: 100 } },
    ]);
  });

  it('Dado un nodo bloqueado, Entonces sirve de referencia pero no se mueve', () => {
    const result = alignNodes(diagram([node('a', 0, 0, { locked: true }), node('b', 50, 100)]), ['a', 'b'], 'left');
    expect(result).toEqual([{ id: 'b', position: { x: 0, y: 100 } }]);
  });

  it('Dado un nodo dentro de un carril, Entonces se alinea en coordenadas absolutas y guarda su posición relativa', () => {
    const lane = node('carril', 200, 0, { artifactType: 'partition', size: { width: 300, height: 400 } });
    const inside = node('dentro', 20, 100, { parentId: 'carril' });
    const outside = node('fuera', 0, 300);
    const result = alignNodes(diagram([lane, inside, outside]), ['dentro', 'fuera'], 'left');
    expect(result).toContainEqual({ id: 'dentro', position: { x: -200, y: 100 } });
  });
});

describe('distributeNodes', () => {
  it('Dados tres nodos, Entonces deja el mismo espacio entre ellos sin mover los extremos', () => {
    const result = distributeNodes(diagram([node('a', 0, 0), node('b', 130, 0), node('c', 400, 0)]), ['a', 'b', 'c'], 'x');
    // Espacio total 500, nodos 300: dos huecos de 100.
    expect(result).toEqual([{ id: 'b', position: { x: 200, y: 0 } }]);
  });

  it('Dados menos de tres nodos, Entonces no hay nada que repartir', () => {
    expect(distributeNodes(diagram([node('a', 0, 0), node('b', 10, 0)]), ['a', 'b'], 'x')).toEqual([]);
  });
});
