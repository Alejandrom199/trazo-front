import { describe, expect, it } from 'vitest';
import { createEmptyDiagram, type Diagram, type DiagramEdge, type DiagramNode } from '@/core/model';
import { ActivityArtifact as A } from './artifactTypes';
import { resolveActivityConnection } from './connections';

function node(id: string, artifactType: string): DiagramNode {
  return {
    id,
    artifactType,
    label: id,
    position: { x: 0, y: 0 },
    size: { width: 10, height: 10 },
    parentId: null,
    props: {},
    notes: '',
    locked: false,
  };
}

function edge(sourceId: string, targetId: string, artifactType: string = A.controlFlow): DiagramEdge {
  return { id: `${sourceId}-${targetId}`, artifactType, sourceId, targetId, guard: null, label: '', routing: 'orthogonal', waypoints: [], lineStyle: null };
}

function diagramWith(nodes: DiagramNode[], edges: DiagramEdge[] = []): Diagram {
  return { ...createEmptyDiagram({ diagramType: 'activity', name: 'test' }), nodes, edges };
}

describe('resolveActivityConnection', () => {
  it('Dadas dos acciones, Entonces se unen con un flujo de control', () => {
    const diagram = diagramWith([node('a', A.action), node('b', A.action)]);

    expect(resolveActivityConnection(diagram, 'a', 'b')).toEqual({ allowed: true, edgeType: A.controlFlow });
  });

  it('Dada una acción y un nodo de objeto, Entonces se unen con un flujo de objeto', () => {
    const diagram = diagramWith([node('a', A.action), node('o', A.objectNode)]);

    expect(resolveActivityConnection(diagram, 'a', 'o')).toEqual({ allowed: true, edgeType: A.objectFlow });
  });

  it('Dada una nota, Entonces se ancla con un vínculo de anotación', () => {
    const diagram = diagramWith([node('n', A.note), node('a', A.action)]);

    expect(resolveActivityConnection(diagram, 'n', 'a')).toEqual({ allowed: true, edgeType: A.annotationLink });
  });

  it('Dado un nodo inicial como destino, Entonces se rechaza (no admite entradas)', () => {
    const diagram = diagramWith([node('a', A.action), node('i', A.initialNode)]);

    expect(resolveActivityConnection(diagram, 'a', 'i')).toMatchObject({ allowed: false });
  });

  it('Dado un nodo final como origen, Entonces se rechaza (no admite salidas)', () => {
    const diagram = diagramWith([node('f', A.activityFinal), node('a', A.action)]);

    expect(resolveActivityConnection(diagram, 'f', 'a')).toMatchObject({ allowed: false });
  });

  it('Dado un nodo inicial hacia un objeto, Entonces se rechaza', () => {
    const diagram = diagramWith([node('i', A.initialNode), node('o', A.objectNode)]);

    expect(resolveActivityConnection(diagram, 'i', 'o')).toMatchObject({ allowed: false });
  });

  it('Dada una fusión con su única salida usada, Entonces una segunda salida se rechaza', () => {
    const diagram = diagramWith(
      [node('m', A.merge), node('a', A.action), node('b', A.action)],
      [edge('m', 'a')],
    );

    expect(resolveActivityConnection(diagram, 'm', 'b')).toMatchObject({ allowed: false });
  });

  it('Dado un fork con su única entrada usada, Entonces una segunda entrada se rechaza', () => {
    const diagram = diagramWith(
      [node('a', A.action), node('b', A.action), node('f', A.fork)],
      [edge('a', 'f')],
    );

    expect(resolveActivityConnection(diagram, 'b', 'f')).toMatchObject({ allowed: false });
  });

  it('Dado un vínculo de nota existente, Entonces no cuenta como flujo para la capacidad', () => {
    const diagram = diagramWith(
      [node('n', A.note), node('m', A.merge), node('a', A.action)],
      [edge('n', 'm', A.annotationLink)],
    );

    expect(resolveActivityConnection(diagram, 'm', 'a')).toEqual({ allowed: true, edgeType: A.controlFlow });
  });

  it('Dados dos nodos ya conectados, Entonces una segunda conexión se rechaza en cualquier sentido', () => {
    const diagram = diagramWith([node('a', A.action), node('b', A.action)], [edge('a', 'b')]);

    expect(resolveActivityConnection(diagram, 'b', 'a')).toMatchObject({ allowed: false });
  });

  it('Dado un carril o el mismo nodo, Entonces se rechaza', () => {
    const diagram = diagramWith([node('p', A.partition), node('a', A.action)]);

    expect(resolveActivityConnection(diagram, 'a', 'p')).toMatchObject({ allowed: false });
    expect(resolveActivityConnection(diagram, 'a', 'a')).toMatchObject({ allowed: false });
  });
});
