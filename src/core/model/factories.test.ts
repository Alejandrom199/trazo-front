import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from './diagram';
import { createDiagramFromTemplate, createEmptyDiagram } from './factories';
import type { Template } from './template';

describe('createEmptyDiagram', () => {
  it('Dado un tipo y nombre, Entonces crea un diagrama vacío con versión y fechas', () => {
    const now = new Date('2026-10-28T12:00:00.000Z');

    const diagram = createEmptyDiagram({ diagramType: 'activity', name: 'Login' }, now);

    expect(diagram).toMatchObject({
      name: 'Login',
      diagramType: 'activity',
      description: '',
      nodes: [],
      edges: [],
      templateId: null,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: '2026-10-28T12:00:00.000Z',
      updatedAt: '2026-10-28T12:00:00.000Z',
    });
    expect(diagram.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('Dadas dos creaciones, Entonces cada diagrama tiene id distinto (vacío)', () => {
    const first = createEmptyDiagram({ diagramType: 'activity', name: 'A' });
    const second = createEmptyDiagram({ diagramType: 'activity', name: 'B' });

    expect(first.id).not.toBe(second.id);
  });
});

describe('createDiagramFromTemplate', () => {
  const template: Template = {
    id: 'activity.demo',
    diagramType: 'activity',
    name: 'Demo',
    description: 'Una demo',
    difficulty: 'básico',
    learningGoals: ['action'],
    diagram: {
      ...createEmptyDiagram({ diagramType: 'activity', name: 'Demo' }),
      nodes: [
        { id: 'lane', artifactType: 'partition', label: 'Cliente', position: { x: 0, y: 0 }, size: { width: 200, height: 300 }, parentId: null, props: {}, notes: '', locked: false },
        { id: 'a', artifactType: 'action', label: 'Pagar', position: { x: 10, y: 50 }, size: { width: 100, height: 50 }, parentId: 'lane', props: {}, notes: '', locked: false },
        { id: 'b', artifactType: 'action', label: 'Salir', position: { x: 10, y: 150 }, size: { width: 100, height: 50 }, parentId: 'lane', props: {}, notes: '', locked: false },
      ],
      edges: [{ id: 'ab', artifactType: 'controlFlow', sourceId: 'a', targetId: 'b', guard: 'ok', label: '', routing: 'orthogonal', waypoints: [], lineStyle: null }],
    },
  };

  it('Dada una plantilla, Entonces copia su contenido con ids nuevos y referencias coherentes', () => {
    const diagram = createDiagramFromTemplate(template, new Date('2026-10-28T12:00:00.000Z'));
    const [lane, pay, exit] = diagram.nodes;
    const [edge] = diagram.edges;

    expect(diagram).toMatchObject({ name: 'Demo', description: 'Una demo', templateId: 'activity.demo', createdAt: '2026-10-28T12:00:00.000Z' });
    expect(diagram.nodes.map((node) => node.id)).not.toContain('a');
    expect(pay?.parentId).toBe(lane?.id);
    expect(edge).toMatchObject({ sourceId: pay?.id, targetId: exit?.id, guard: 'ok' });
  });

  it('Dado un diagrama creado, Entonces modificarlo no altera la plantilla', () => {
    const diagram = createDiagramFromTemplate(template);
    diagram.nodes[1]!.position.x = 999;

    expect(template.diagram.nodes[1]?.position.x).toBe(10);
  });
});

describe('createEmptyDiagram (ids)', () => {
  it('Dadas dos creaciones, Entonces cada diagrama tiene id distinto', () => {
    const first = createEmptyDiagram({ diagramType: 'activity', name: 'A' });
    const second = createEmptyDiagram({ diagramType: 'activity', name: 'B' });

    expect(first.id).not.toBe(second.id);
  });
});
