import { describe, expect, it } from 'vitest';
import type { Diagram, DiagramEdge, DiagramNode } from './diagram';
import { createEmptyDiagram } from './factories';
import { absolutePosition, findContainerAt, removeElements, reparentNode } from './operations';

function node(id: string, overrides: Partial<DiagramNode> = {}): DiagramNode {
  return {
    id,
    artifactType: 'action',
    label: id,
    position: { x: 0, y: 0 },
    size: { width: 100, height: 50 },
    parentId: null,
    props: {},
    notes: '',
    locked: false,
    ...overrides,
  };
}

function edge(id: string, sourceId: string, targetId: string): DiagramEdge {
  return { id, artifactType: 'controlFlow', sourceId, targetId, guard: null, label: '', routing: 'orthogonal', waypoints: [], lineStyle: null, props: {} };
}

function diagramWith(nodes: DiagramNode[], edges: DiagramEdge[] = []): Diagram {
  return { ...createEmptyDiagram({ diagramType: 'activity', name: 'test' }), nodes, edges };
}

const lane = node('lane', { artifactType: 'partition', position: { x: 100, y: 50 }, size: { width: 300, height: 500 } });
const isLane = (candidate: DiagramNode) => candidate.artifactType === 'partition';

describe('removeElements', () => {
  it('Dado un nodo borrado, Entonces se borran también sus conexiones', () => {
    const diagram = diagramWith([node('a'), node('b'), node('c')], [edge('ab', 'a', 'b'), edge('bc', 'b', 'c')]);

    const result = removeElements(diagram, { nodeIds: ['a'], edgeIds: [] });

    expect(result.nodes.map((n) => n.id)).toEqual(['b', 'c']);
    expect(result.edges.map((e) => e.id)).toEqual(['bc']);
  });

  it('Dado un carril borrado, Entonces se borran los nodos que contiene', () => {
    const diagram = diagramWith([lane, node('inside', { parentId: 'lane' }), node('outside')]);

    const result = removeElements(diagram, { nodeIds: ['lane'], edgeIds: [] });

    expect(result.nodes.map((n) => n.id)).toEqual(['outside']);
  });

  it('Dado un nodo bloqueado, Entonces no se borra ni pierde sus conexiones', () => {
    const diagram = diagramWith([node('a', { locked: true }), node('b')], [edge('ab', 'a', 'b')]);

    const result = removeElements(diagram, { nodeIds: ['a'], edgeIds: [] });

    expect(result.nodes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(result.edges.map((e) => e.id)).toEqual(['ab']);
  });

  it('Dado un carril con un nodo bloqueado dentro, Entonces el carril tampoco se borra', () => {
    const diagram = diagramWith([lane, node('fijo', { parentId: 'lane', locked: true }), node('suelto', { parentId: 'lane' })]);

    const result = removeElements(diagram, { nodeIds: ['lane', 'suelto'], edgeIds: [] });

    expect(result.nodes.map((n) => n.id)).toEqual(['lane', 'fijo']);
  });

  it('No muta el diagrama original', () => {
    const diagram = diagramWith([node('a')]);

    removeElements(diagram, { nodeIds: ['a'], edgeIds: [] });

    expect(diagram.nodes).toHaveLength(1);
  });
});

describe('reparentNode', () => {
  it('Dado un nodo suelto que entra a un carril, Entonces su posición pasa a ser relativa sin moverse', () => {
    const diagram = diagramWith([lane, node('a', { position: { x: 150, y: 120 } })]);

    const result = reparentNode(diagram, 'a', 'lane');
    const moved = result.nodes.find((n) => n.id === 'a')!;

    expect(moved.parentId).toBe('lane');
    expect(moved.position).toEqual({ x: 50, y: 70 });
    expect(absolutePosition(result, moved)).toEqual({ x: 150, y: 120 });
  });

  it('Dado un nodo que sale del carril, Entonces su posición vuelve a ser absoluta', () => {
    const diagram = diagramWith([lane, node('a', { parentId: 'lane', position: { x: 10, y: 20 } })]);

    const moved = reparentNode(diagram, 'a', null).nodes.find((n) => n.id === 'a')!;

    expect(moved).toMatchObject({ parentId: null, position: { x: 110, y: 70 } });
  });

  it('Dado el mismo padre, Entonces devuelve el mismo diagrama', () => {
    const diagram = diagramWith([lane, node('a', { parentId: 'lane' })]);

    expect(reparentNode(diagram, 'a', 'lane')).toBe(diagram);
  });
});

describe('findContainerAt', () => {
  it('Dado un punto dentro del carril, Entonces lo encuentra; fuera, devuelve null', () => {
    const diagram = diagramWith([lane]);

    expect(findContainerAt(diagram, { x: 200, y: 300 }, isLane)?.id).toBe('lane');
    expect(findContainerAt(diagram, { x: 50, y: 300 }, isLane)).toBeNull();
  });
});
