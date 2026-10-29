import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from './diagram';
import { createEmptyDiagram } from './factories';

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

  it('Dadas dos creaciones, Entonces cada diagrama tiene id distinto', () => {
    const first = createEmptyDiagram({ diagramType: 'activity', name: 'A' });
    const second = createEmptyDiagram({ diagramType: 'activity', name: 'B' });

    expect(first.id).not.toBe(second.id);
  });
});
