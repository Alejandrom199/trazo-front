import { describe, expect, it } from 'vitest';
import { createEmptyDiagram, DEFAULT_EDGE_SHAPE, type Diagram, type DiagramEdge, type DiagramNode } from '@/core/model';
import { activityModule } from '@/diagrams/activity';
import { classModule } from '@/diagrams/class';
import { ClassArtifact as C } from '@/diagrams/class/artifactTypes';
import { HOLLOW_TRIANGLE_MARKER, toFlowEdges, toFlowNodes } from './adapters';

const node = (id: string, artifactType: string): DiagramNode => ({
  id,
  artifactType,
  label: '',
  position: { x: 0, y: 0 },
  size: { width: 100, height: 50 },
  parentId: null,
  props: {},
  notes: '',
  locked: false,
});

const edge = (id: string, artifactType: string): DiagramEdge => ({
  id,
  artifactType,
  sourceId: 'a',
  targetId: 'b',
  guard: null,
  label: '',
  ...DEFAULT_EDGE_SHAPE,
  waypoints: [],
  props: {},
});

const diagram: Diagram = {
  ...createEmptyDiagram({ diagramType: 'activity', name: 'x' }),
  nodes: [node('nota', 'note'), node('paso', 'action')],
  edges: [{ id: 'ancla', artifactType: 'annotationLink', sourceId: 'nota', targetId: 'paso', guard: null, label: '', ...DEFAULT_EDGE_SHAPE, waypoints: [], props: {} }],
};
const noSelection = { nodeIds: [], edgeIds: [] };

describe('detalle secundario', () => {
  it('Dado un artefacto que su módulo declara secundario, Entonces el lienzo lo marca para la vista compacta', () => {
    const classes = new Map(toFlowNodes(diagram, activityModule, noSelection).map((flowNode) => [flowNode.id, flowNode.className ?? '']));

    expect(classes.get('nota')).toContain('trazo-secondary-detail');
    expect(classes.get('paso')).not.toContain('trazo-secondary-detail');
    expect(toFlowEdges(diagram, activityModule, noSelection)[0]?.className).toContain('trazo-secondary-detail');
  });
});

describe('figuras de conexión', () => {
  const classDiagram: Diagram = {
    ...createEmptyDiagram({ diagramType: 'class', name: 'clases' }),
    nodes: [node('a', C.class), node('b', C.class)],
    edges: [
      edge('asoc', C.association),
      edge('agr', C.aggregation),
      edge('comp', C.composition),
      edge('gen', C.generalization),
      edge('dep', C.dependency),
    ],
  };

  it('Dado cada tipo de relación, Entonces el lienzo recibe la misma figura que la paleta', () => {
    const byId = new Map(toFlowEdges(classDiagram, classModule, noSelection).map((flowEdge) => [flowEdge.id, flowEdge]));

    expect(byId.get('asoc')?.markerStart).toBeUndefined();
    expect(byId.get('asoc')?.markerEnd).toBeUndefined();

    // Agregación/composición: el rombo lo dibuja FlowEdgeView, no un marker-start.
    expect(byId.get('agr')?.markerStart).toBeUndefined();
    expect(byId.get('agr')?.markerEnd).toBeUndefined();
    expect(classModule.edgeKinds[C.aggregation]?.sourceMarker).toBe('diamond-open');

    expect(byId.get('comp')?.markerStart).toBeUndefined();
    expect(byId.get('comp')?.markerEnd).toBeUndefined();
    expect(classModule.edgeKinds[C.composition]?.sourceMarker).toBe('diamond-filled');

    expect(byId.get('gen')?.markerStart).toBeUndefined();
    expect(byId.get('gen')?.markerEnd).toBe(HOLLOW_TRIANGLE_MARKER);

    expect(byId.get('dep')?.markerStart).toBeUndefined();
    expect(byId.get('dep')?.markerEnd).toMatchObject({ type: expect.anything() });
    expect(byId.get('dep')?.style?.strokeDasharray).toBeTruthy();
  });
});
