import { describe, expect, it } from 'vitest';
import { addNode, createEmptyDiagram, type DiagramProject } from '@/core/model';
import { projectFromJson, projectToJson } from './projectFormat';

describe('formato de proyecto', () => {
  const diagram = createEmptyDiagram({ diagramType: 'activity', name: 'Préstamo' }, new Date(0));
  const project: DiagramProject = { id: 'p1', name: 'Biblioteca', diagramIds: [diagram.id], traceLinks: [], createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() };

  it('exporta e importa todos los diagramas', () => {
    const result = projectFromJson(projectToJson(project, [diagram]));
    expect(result.ok && result.project.name).toBe('Biblioteca');
    expect(result.ok && result.project.diagrams).toHaveLength(1);
  });

  it('rechaza un JSON que no es un proyecto', () => {
    expect(projectFromJson('{"name":"x"}')).toEqual({ ok: false, error: 'El archivo no es un proyecto de Trazo.' });
  });

  it('conserva los vínculos entre elementos al exportar', () => {
    const first = addNode(diagram, { id: 'n1', artifactType: 'action', label: 'Prestar', position: { x: 0, y: 0 }, size: { width: 120, height: 50 }, parentId: null, props: {}, notes: '', locked: false });
    const secondBase = createEmptyDiagram({ diagramType: 'class', name: 'Dominio' }, new Date(0));
    const second = addNode(secondBase, { id: 'n2', artifactType: 'class', label: 'Préstamo', position: { x: 0, y: 0 }, size: { width: 160, height: 100 }, parentId: null, props: {}, notes: '', locked: false });
    const linked: DiagramProject = { ...project, diagramIds: [first.id, second.id], traceLinks: [{ id: 't1', source: { diagramId: first.id, elementId: 'n1', kind: 'node' }, target: { diagramId: second.id, elementId: 'n2', kind: 'node' }, relation: 'implementa', createdAt: new Date(0).toISOString() }] };
    const result = projectFromJson(projectToJson(linked, [first, second]));
    expect(result.ok && result.project.traceLinks[0]?.relation).toBe('implementa');
  });

  it('abre proyectos v1 sin vínculos', () => {
    const legacy = JSON.parse(projectToJson(project, [diagram]));
    legacy.schemaVersion = 1;
    delete legacy.traceLinks;
    const result = projectFromJson(JSON.stringify(legacy));
    expect(result.ok && result.project.traceLinks).toEqual([]);
  });
});
