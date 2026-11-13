import { describe, expect, it } from 'vitest';
import type { DiagramProject } from '@/core/model';
import type { KeyValueStorage } from './diagramRepository';
import { readProjectLibrary, writeProjectLibrary } from './projectLibrary';

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const project = (id: string, name = id): DiagramProject => ({
  id,
  name,
  diagramIds: [`${id}-d1`],
  traceLinks: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('biblioteca de proyectos', () => {
  it('Dado un navegador sin proyectos, Entonces la lista está vacía y no hay activo', () => {
    expect(readProjectLibrary(memoryStorage())).toEqual({ projects: [], activeId: null });
  });

  it('Dados varios proyectos guardados, Entonces se leen todos y el activo', () => {
    const storage = memoryStorage();
    writeProjectLibrary(storage, { projects: [project('a'), project('b')], activeId: 'b' });

    expect(readProjectLibrary(storage)).toEqual({ projects: [project('a'), project('b')], activeId: 'b' });
  });

  it('Dado un activo que ya no está en la lista, Entonces no queda ninguno abierto', () => {
    const storage = memoryStorage({ 'trazo.projects': JSON.stringify([project('a')]), 'trazo.activeProjectId': 'z' });

    expect(readProjectLibrary(storage).activeId).toBeNull();
  });

  it('Dado el formato anterior (solo el activo), Entonces pasa a la lista como abierto y la clave vieja se borra al escribir', () => {
    const storage = memoryStorage({ 'trazo.activeProject': JSON.stringify(project('viejo', 'Mi proyecto')) });

    const library = readProjectLibrary(storage);
    expect(library).toEqual({ projects: [project('viejo', 'Mi proyecto')], activeId: 'viejo' });

    writeProjectLibrary(storage, library);
    expect(storage.data.has('trazo.activeProject')).toBe(false);
    expect(readProjectLibrary(storage)).toEqual(library);
  });

  it('Dado el formato anterior con un proyecto que también está en la lista, Entonces gana la versión vieja (es la más reciente)', () => {
    const storage = memoryStorage({
      'trazo.projects': JSON.stringify([project('a', 'Nombre antiguo'), project('b')]),
      'trazo.activeProject': JSON.stringify(project('a', 'Nombre nuevo')),
    });

    expect(readProjectLibrary(storage)).toEqual({ projects: [project('a', 'Nombre nuevo'), project('b')], activeId: 'a' });
  });

  it('Dados datos ilegibles, Entonces se ignoran sin romper', () => {
    const storage = memoryStorage({ 'trazo.projects': '{roto', 'trazo.activeProject': '[1,2]' });

    expect(readProjectLibrary(storage)).toEqual({ projects: [], activeId: null });
  });
});
