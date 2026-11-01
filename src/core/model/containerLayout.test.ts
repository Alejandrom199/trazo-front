import { describe, expect, it } from 'vitest';
import { joinedSides, snapContainerPosition } from './containerLayout';
import type { Diagram, DiagramNode } from './diagram';
import { createEmptyDiagram } from './factories';

function lane(id: string, x: number, y = 0, overrides: Partial<DiagramNode> = {}): DiagramNode {
  return {
    id,
    artifactType: 'partition',
    label: id,
    position: { x, y },
    size: { width: 200, height: 400 },
    parentId: null,
    props: {},
    notes: '',
    locked: false,
    ...overrides,
  };
}

const isLane = (node: DiagramNode) => node.artifactType === 'partition';
const diagramWith = (nodes: DiagramNode[]): Diagram => ({ ...createEmptyDiagram({ diagramType: 'activity', name: 't' }), nodes });
const size = { width: 200, height: 400 };

describe('snapContainerPosition', () => {
  it('Dado un carril a 10 px a la derecha de otro, Entonces se pega a su costado y alinea el borde superior', () => {
    const diagram = diagramWith([lane('a', 0)]);

    expect(snapContainerPosition(diagram, null, { x: 210, y: 8 }, size, isLane)).toEqual({ x: 200, y: 0 });
  });

  it('Dado un carril que se acerca por la izquierda, Entonces se pega con su borde derecho', () => {
    const diagram = diagramWith([lane('a', 300)]);

    expect(snapContainerPosition(diagram, null, { x: 95, y: 0 }, size, isLane)).toEqual({ x: 100, y: 0 });
  });

  it('Dado un carril lejos de todos, Entonces conserva su posición', () => {
    const diagram = diagramWith([lane('a', 0)]);

    expect(snapContainerPosition(diagram, null, { x: 260, y: 0 }, size, isLane)).toEqual({ x: 260, y: 0 });
  });

  it('Dado el propio carril que se mueve, Entonces no se pega a sí mismo', () => {
    const diagram = diagramWith([lane('a', 0)]);

    expect(snapContainerPosition(diagram, 'a', { x: 5, y: 0 }, size, isLane)).toEqual({ x: 5, y: 0 });
  });
});

describe('joinedSides', () => {
  it('Dados dos carriles pegados, Entonces cada uno sabe de qué lado está unido', () => {
    const left = lane('a', 0);
    const right = lane('b', 200);
    const diagram = diagramWith([left, right]);

    expect(joinedSides(diagram, left, isLane)).toEqual({ top: false, right: true, bottom: false, left: false });
    expect(joinedSides(diagram, right, isLane)).toEqual({ top: false, right: false, bottom: false, left: true });
  });

  it('Dados dos carriles separados, Entonces ningún lado está unido', () => {
    const diagram = diagramWith([lane('a', 0), lane('b', 240)]);

    expect(joinedSides(diagram, diagram.nodes[0]!, isLane)).toEqual({ top: false, right: false, bottom: false, left: false });
  });

  it('Dados carriles alineados en x pero sin tramo vertical en común, Entonces no están unidos', () => {
    const diagram = diagramWith([lane('a', 0), lane('b', 200, 500)]);

    expect(joinedSides(diagram, diagram.nodes[0]!, isLane).right).toBe(false);
  });
});
