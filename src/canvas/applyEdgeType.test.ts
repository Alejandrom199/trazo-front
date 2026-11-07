import { describe, expect, it } from 'vitest';
import { createEmptyDiagram, DEFAULT_EDGE_SHAPE, type DiagramEdge } from '@/core/model';
import { classModule } from '@/diagrams/class';
import { ClassArtifact as C } from '@/diagrams/class/artifactTypes';
import { initialClassEdge } from '@/diagrams/class/connections';
import { useCaseModule } from '@/diagrams/usecase';
import { UseCaseArtifact as U } from '@/diagrams/usecase/artifactTypes';
import { edgeTypeChangePatch, isStereotypeLabel } from './applyEdgeType';

const edge = (artifactType: string, label: string): DiagramEdge => ({
  id: 'e',
  artifactType,
  sourceId: 'a',
  targetId: 'b',
  guard: null,
  label,
  ...DEFAULT_EDGE_SHAPE,
  waypoints: [],
  props: {},
});

const diagram = createEmptyDiagram({ diagramType: 'class', name: 'x' });

describe('initialClassEdge', () => {
  it('pone estereotipos en generalización, dependencia y realización', () => {
    expect(initialClassEdge(C.generalization)).toEqual({ label: '«extends»', props: {} });
    expect(initialClassEdge(C.dependency)).toEqual({ label: '«use»', props: {} });
    expect(initialClassEdge(C.realization)).toEqual({ label: '«implements»', props: {} });
    expect(initialClassEdge(C.association)).toEqual({ label: '', props: {} });
    expect(initialClassEdge(C.aggregation)).toEqual({ label: '', props: {} });
  });
});

describe('edgeTypeChangePatch', () => {
  it('al pasar a dependencia pone «use» si no había texto propio', () => {
    expect(edgeTypeChangePatch(classModule, diagram, edge(C.association, ''), C.dependency)).toEqual({
      artifactType: C.dependency,
      lineStyle: null,
      label: '«use»',
    });
  });

  it('al pasar a realización pone «implements» si el texto era un estereotipo', () => {
    expect(edgeTypeChangePatch(classModule, diagram, edge(C.dependency, '«use»'), C.realization).label).toBe('«implements»');
  });

  it('conserva multiplicidades escritas a mano', () => {
    const patch = edgeTypeChangePatch(classModule, diagram, edge(C.association, '1 solicita 0..*'), C.aggregation);
    expect(patch).toEqual({ artifactType: C.aggregation, lineStyle: null });
    expect(patch.label).toBeUndefined();
  });

  it('en casos de uso aplica «include» y «extend»', () => {
    const useCaseDiagram = createEmptyDiagram({ diagramType: 'usecase', name: 'x' });
    expect(edgeTypeChangePatch(useCaseModule, useCaseDiagram, edge(U.association, ''), U.include).label).toBe('«include»');
    expect(edgeTypeChangePatch(useCaseModule, useCaseDiagram, edge(U.include, '«include»'), U.extend).label).toBe('«extend»');
  });
});

describe('isStereotypeLabel', () => {
  it('reconoce guillemets UML', () => {
    expect(isStereotypeLabel('«use»')).toBe(true);
    expect(isStereotypeLabel('«implements»')).toBe(true);
    expect(isStereotypeLabel('1..*')).toBe(false);
  });
});
