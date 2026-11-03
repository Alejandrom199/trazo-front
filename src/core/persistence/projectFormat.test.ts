import { describe, expect, it } from 'vitest';
import { createEmptyDiagram, type DiagramProject } from '@/core/model';
import { projectFromJson, projectToJson } from './projectFormat';

describe('formato de proyecto', () => {
  const diagram = createEmptyDiagram({ diagramType: 'activity', name: 'Préstamo' }, new Date(0));
  const project: DiagramProject = { id: 'p1', name: 'Biblioteca', diagramIds: [diagram.id], createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() };

  it('exporta e importa todos los diagramas', () => {
    const result = projectFromJson(projectToJson(project, [diagram]));
    expect(result.ok && result.project.name).toBe('Biblioteca');
    expect(result.ok && result.project.diagrams).toHaveLength(1);
  });

  it('rechaza un JSON que no es un proyecto', () => {
    expect(projectFromJson('{"name":"x"}')).toEqual({ ok: false, error: 'El archivo no es un proyecto de Trazo.' });
  });
});
