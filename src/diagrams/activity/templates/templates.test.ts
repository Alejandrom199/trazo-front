import { describe, expect, it } from 'vitest';
import { ActivityArtifact as A } from '../artifactTypes';
import { activityTemplates } from '.';

describe('plantillas del diagrama de actividades', () => {
  it('Hay al menos 4 plantillas con ids únicos', () => {
    const ids = activityTemplates.map((template) => template.id);

    expect(ids.length).toBeGreaterThanOrEqual(4);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(activityTemplates)('$name contiene cada artefacto que dice enseñar', (template) => {
    const used = new Set([
      ...template.diagram.nodes.map((node) => node.artifactType),
      ...template.diagram.edges.map((edge) => edge.artifactType),
    ]);

    for (const goal of template.learningGoals) expect(used, goal).toContain(goal);
  });

  it.each(activityTemplates)('$name tiene exactamente un nodo inicial', (template) => {
    const initialNodes = template.diagram.nodes.filter((node) => node.artifactType === A.initialNode);

    expect(initialNodes).toHaveLength(1);
  });

  it.each(activityTemplates)('$name: toda salida de una decisión lleva guarda', (template) => {
    const decisionIds = new Set(
      template.diagram.nodes.filter((node) => node.artifactType === A.decision).map((node) => node.id),
    );
    const decisionExits = template.diagram.edges.filter((edge) => decisionIds.has(edge.sourceId));

    for (const edge of decisionExits) expect(edge.guard).toBeTruthy();
  });
});
