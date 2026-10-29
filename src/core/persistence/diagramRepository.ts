import type { Diagram, DiagramType } from '@/core/model';
import { parseDiagram } from './diagramFormat';

/** Lo mínimo de un almacenamiento clave/valor. localStorage lo cumple; las pruebas usan un Map. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Resumen para listar diagramas sin leerlos completos. */
export interface DiagramSummary {
  id: string;
  name: string;
  diagramType: DiagramType;
  updatedAt: string;
}

const KEY_PREFIX = 'trazo.';
const INDEX_KEY = `${KEY_PREFIX}diagrams`;
const LAST_OPENED_KEY = `${KEY_PREFIX}lastOpened`;
const diagramKey = (id: string) => `${KEY_PREFIX}diagram.${id}`;

/**
 * Guarda cada diagrama en su propia clave y mantiene aparte un índice con los
 * resúmenes: así la lista no tiene que leer (ni parsear) todos los diagramas.
 * Los errores de escritura (p. ej. almacenamiento lleno) se propagan para que
 * quien llama los muestre; las lecturas corruptas se ignoran en lugar de romper la app.
 */
export function createDiagramRepository(storage: KeyValueStorage) {
  function readIndex(): DiagramSummary[] {
    try {
      const parsed: unknown = JSON.parse(storage.getItem(INDEX_KEY) ?? '[]');
      return Array.isArray(parsed) ? (parsed as DiagramSummary[]) : [];
    } catch {
      return [];
    }
  }

  function writeIndex(index: DiagramSummary[]): void {
    storage.setItem(INDEX_KEY, JSON.stringify(index));
  }

  return {
    /** Diagramas guardados, el más reciente primero. */
    list(): DiagramSummary[] {
      return [...readIndex()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    load(id: string): Diagram | null {
      try {
        const raw = storage.getItem(diagramKey(id));
        if (raw === null) return null;
        const result = parseDiagram(JSON.parse(raw));
        return result.ok ? result.diagram : null;
      } catch {
        return null;
      }
    },

    save(diagram: Diagram): void {
      storage.setItem(diagramKey(diagram.id), JSON.stringify(diagram));
      const summary: DiagramSummary = {
        id: diagram.id,
        name: diagram.name,
        diagramType: diagram.diagramType,
        updatedAt: diagram.updatedAt,
      };
      writeIndex([summary, ...readIndex().filter((entry) => entry.id !== diagram.id)]);
    },

    remove(id: string): void {
      storage.removeItem(diagramKey(id));
      writeIndex(readIndex().filter((entry) => entry.id !== id));
      if (storage.getItem(LAST_OPENED_KEY) === id) storage.removeItem(LAST_OPENED_KEY);
    },

    lastOpenedId(): string | null {
      return storage.getItem(LAST_OPENED_KEY);
    },

    setLastOpened(id: string): void {
      storage.setItem(LAST_OPENED_KEY, id);
    },
  };
}

export type DiagramRepository = ReturnType<typeof createDiagramRepository>;

/**
 * localStorage si el navegador lo permite. En modo privado o con el almacenamiento
 * bloqueado, el solo hecho de acceder puede lanzar: entonces se devuelve null y la
 * app funciona igual, sin guardar.
 */
export function browserStorage(): KeyValueStorage | null {
  try {
    const storage = window.localStorage;
    const probe = `${KEY_PREFIX}probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}
