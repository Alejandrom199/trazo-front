import { describe, expect, it } from 'vitest';
import type { DiagramEdge } from '@/core/model';
import { activityModule } from '@/diagrams/activity';
import { ActivityArtifact as A } from '@/diagrams/activity/artifactTypes';
import { classModule } from '@/diagrams/class';
import { ClassArtifact as C } from '@/diagrams/class/artifactTypes';
import { canSwitchEdgeTo, chosenEdgeType, edgeTypeOptions, switchableSelectedEdges } from './edgeTypeChoice';

const edge = (id: string, artifactType: string): DiagramEdge => ({
  id,
  artifactType,
  sourceId: 'a',
  targetId: 'b',
  guard: null,
  label: '',
  routing: 'straight',
  waypoints: [],
  lineStyle: null,
  props: {},
});

describe('chosenEdgeType', () => {
  it('usa el tipo de la paleta cuando la relación de clases lo admite', () => {
    expect(chosenEdgeType(classModule, C.association, C.aggregation)).toBe(C.aggregation);
    expect(chosenEdgeType(classModule, C.association, C.composition)).toBe(C.composition);
    expect(chosenEdgeType(classModule, C.association, C.generalization)).toBe(C.generalization);
  });

  it('conserva el deducido si la paleta pide un tipo incompatible', () => {
    expect(chosenEdgeType(classModule, C.association, C.annotationLink)).toBe(C.association);
    expect(chosenEdgeType(activityModule, A.controlFlow, A.objectFlow)).toBe(A.controlFlow);
  });
});

describe('edgeTypeOptions', () => {
  it('ofrece las relaciones estructurales de clases', () => {
    expect(edgeTypeOptions(classModule, C.association).map((artifact) => artifact.type)).toEqual([
      C.association,
      C.aggregation,
      C.composition,
      C.generalization,
      C.realization,
      C.dependency,
    ]);
  });

  it('no ofrece alternativas para el flujo de control de actividades', () => {
    expect(edgeTypeOptions(activityModule, A.controlFlow)).toEqual([]);
  });
});

describe('switchableSelectedEdges', () => {
  const edges = [edge('ab', C.association), edge('cd', C.dependency)];

  it('cambia las flechas seleccionadas al tipo pedido', () => {
    expect(switchableSelectedEdges(classModule, edges, ['ab'], [], C.aggregation).map((item) => item.id)).toEqual(['ab']);
  });

  it('no cambia nada si también hay nodos seleccionados', () => {
    expect(switchableSelectedEdges(classModule, edges, ['ab'], ['n1'], C.aggregation)).toEqual([]);
  });

  it('no cambia si alguna flecha no admite el tipo', () => {
    expect(canSwitchEdgeTo(classModule, C.annotationLink, C.aggregation)).toBe(false);
    expect(
      switchableSelectedEdges(classModule, [edge('note', C.annotationLink), ...edges], ['note', 'ab'], [], C.aggregation),
    ).toEqual([]);
  });
});
