import { describe, expect, it } from 'vitest';
import { createEmptyDiagram, type DiagramEdge, type DiagramNode } from '@/core/model';
import { describeConnectionRules } from './connectionRulesText';
import { resolveExplanationTarget } from './explanationTarget';

const node: DiagramNode = {
  id: 'a',
  artifactType: 'action',
  label: 'Pagar',
  position: { x: 0, y: 0 },
  size: { width: 10, height: 10 },
  parentId: null,
  props: {},
  notes: '',
  locked: false,
};
const edge: DiagramEdge = { id: 'e', artifactType: 'controlFlow', sourceId: 'a', targetId: 'a', guard: null, label: '' };
const diagram = { ...createEmptyDiagram({ diagramType: 'activity', name: 't' }), nodes: [node], edges: [edge] };

describe('resolveExplanationTarget', () => {
  it('Dada una selección vacía, Entonces no hay nada que explicar', () => {
    expect(resolveExplanationTarget(diagram, { nodeIds: [], edgeIds: [] })).toEqual({ kind: 'none' });
  });

  it('Dado un nodo seleccionado, Entonces explica ese nodo', () => {
    expect(resolveExplanationTarget(diagram, { nodeIds: ['a'], edgeIds: [] })).toEqual({ kind: 'node', node });
  });

  it('Dada una conexión seleccionada, Entonces explica esa conexión', () => {
    expect(resolveExplanationTarget(diagram, { nodeIds: [], edgeIds: ['e'] })).toEqual({ kind: 'edge', edge });
  });

  it('Dados varios elementos, Entonces indica cuántos hay', () => {
    expect(resolveExplanationTarget(diagram, { nodeIds: ['a'], edgeIds: ['e'] })).toEqual({ kind: 'multiple', count: 2 });
  });

  it('Dado un id que ya no existe, Entonces lo ignora', () => {
    expect(resolveExplanationTarget(diagram, { nodeIds: ['borrado'], edgeIds: [] })).toEqual({ kind: 'none' });
  });
});

describe('describeConnectionRules', () => {
  it.each([
    [{ minIn: 0, maxIn: 0, minOut: 1, maxOut: null }, { incoming: 'ninguna', outgoing: '1 o más' }],
    [{ minIn: 1, maxIn: 1, minOut: 2, maxOut: null }, { incoming: 'exactamente 1', outgoing: '2 o más' }],
    [{ minIn: 0, maxIn: null, minOut: 0, maxOut: 3 }, { incoming: 'cualquier cantidad', outgoing: 'hasta 3' }],
    [{ minIn: 1, maxIn: 2, minOut: 0, maxOut: 0 }, { incoming: 'entre 1 y 2', outgoing: 'ninguna' }],
  ])('Dadas %j, Entonces se describe como %j', (rules, expected) => {
    expect(describeConnectionRules(rules)).toEqual(expected);
  });

  it('Dado un artefacto sin flujos, Entonces no hay descripción', () => {
    expect(describeConnectionRules({ minIn: 0, maxIn: 0, minOut: 0, maxOut: 0 })).toBeNull();
  });
});
