import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, createEmptyDiagram, type Diagram } from '@/core/model';
import { parseDiagram } from './diagramFormat';
import { createDiagramRepository, type KeyValueStorage } from './diagramRepository';

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

function sampleDiagram(name = 'Login', updatedAt = '2026-10-28T12:00:00.000Z'): Diagram {
  return {
    ...createEmptyDiagram({ diagramType: 'activity', name }),
    updatedAt,
    nodes: [
      { id: 'a', artifactType: 'action', label: 'Pagar', position: { x: 0, y: 0 }, size: { width: 140, height: 60 }, parentId: null, props: {}, notes: '', locked: false },
      { id: 'b', artifactType: 'activityFinal', label: '', position: { x: 0, y: 100 }, size: { width: 30, height: 30 }, parentId: null, props: {}, notes: '', locked: false },
    ],
    edges: [{ id: 'ab', artifactType: 'controlFlow', sourceId: 'a', targetId: 'b', guard: null, label: '' }],
  };
}

describe('parseDiagram', () => {
  it('Dado un diagrama válido serializado, Entonces lo recupera idéntico', () => {
    const diagram = sampleDiagram();

    expect(parseDiagram(JSON.parse(JSON.stringify(diagram)))).toEqual({ ok: true, diagram });
  });

  it.each([
    ['algo que no es un objeto', 42],
    ['un objeto sin versión', { name: 'x' }],
    ['una conexión a un nodo inexistente', { ...sampleDiagram(), edges: [{ id: 'e', artifactType: 'controlFlow', sourceId: 'a', targetId: 'zzz', guard: null, label: '' }] }],
    ['un nodo con posición no numérica', { ...sampleDiagram(), nodes: [{ ...sampleDiagram().nodes[0], position: { x: 'uno', y: 0 } }], edges: [] }],
    ['un contenedor inexistente', { ...sampleDiagram(), nodes: [{ ...sampleDiagram().nodes[0], parentId: 'fantasma' }], edges: [] }],
  ])('Dado %s, Entonces lo rechaza con un mensaje', (_case, raw) => {
    const result = parseDiagram(raw);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });

  it('Dado un diagrama guardado en la versión 1 (sin bloqueo), Entonces lo migra con los nodos desbloqueados', () => {
    const current = sampleDiagram();
    const v1 = { ...current, schemaVersion: 1, nodes: current.nodes.map(({ locked: _locked, ...node }) => node) };

    const result = parseDiagram(JSON.parse(JSON.stringify(v1)));

    expect(result).toMatchObject({ ok: true, diagram: { schemaVersion: CURRENT_SCHEMA_VERSION } });
    if (result.ok) expect(result.diagram.nodes.every((node) => node.locked === false)).toBe(true);
  });

  it('Dado un diagrama de una versión futura, Entonces pide actualizar la app', () => {
    const result = parseDiagram({ ...sampleDiagram(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 });

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('más nueva') });
  });
});

describe('repositorio de diagramas', () => {
  it('Dado un diagrama guardado, Entonces se puede cargar y aparece en la lista', () => {
    const repository = createDiagramRepository(memoryStorage());
    const diagram = sampleDiagram();

    repository.save(diagram);

    expect(repository.load(diagram.id)).toEqual(diagram);
    expect(repository.list()).toEqual([{ id: diagram.id, name: 'Login', diagramType: 'activity', updatedAt: diagram.updatedAt }]);
  });

  it('Dados varios diagramas, Entonces la lista va del más reciente al más antiguo y sin duplicados al resguardar', () => {
    const repository = createDiagramRepository(memoryStorage());
    const old = sampleDiagram('Viejo', '2026-01-01T00:00:00.000Z');
    const recent = sampleDiagram('Nuevo', '2026-06-01T00:00:00.000Z');

    repository.save(old);
    repository.save(recent);
    repository.save({ ...old, name: 'Viejo renombrado' });

    expect(repository.list().map((entry) => entry.name)).toEqual(['Nuevo', 'Viejo renombrado']);
  });

  it('Dado un diagrama borrado, Entonces desaparece y deja de ser el último abierto', () => {
    const repository = createDiagramRepository(memoryStorage());
    const diagram = sampleDiagram();
    repository.save(diagram);
    repository.setLastOpened(diagram.id);

    repository.remove(diagram.id);

    expect(repository.load(diagram.id)).toBeNull();
    expect(repository.list()).toEqual([]);
    expect(repository.lastOpenedId()).toBeNull();
  });

  it('Dado un dato corrupto en el almacenamiento, Entonces load devuelve null en vez de romper', () => {
    const storage = memoryStorage();
    storage.setItem('trazo.diagram.roto', '{esto no es json');
    storage.setItem('trazo.diagrams', 'tampoco');

    const repository = createDiagramRepository(storage);

    expect(repository.load('roto')).toBeNull();
    expect(repository.list()).toEqual([]);
  });
});
