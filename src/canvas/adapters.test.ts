import { describe, expect, it } from 'vitest';
import { createEmptyDiagram, DEFAULT_EDGE_SHAPE, type Diagram, type DiagramNode } from '@/core/model';
import { activityModule } from '@/diagrams/activity';
import { toFlowEdges, toFlowNodes } from './adapters';

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
