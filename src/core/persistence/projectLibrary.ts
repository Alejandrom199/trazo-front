import type { DiagramProject, TraceEndpoint, TraceLink } from '@/core/model';
import type { KeyValueStorage } from './diagramRepository';

const PROJECTS_KEY = 'trazo.projects';
const ACTIVE_KEY = 'trazo.activeProjectId';
/** Versión anterior: solo se guardaba el proyecto activo, completo, en esta clave. */
const LEGACY_ACTIVE_KEY = 'trazo.activeProject';

/** Todos los proyectos guardados en el navegador y cuál está abierto. */
export interface ProjectLibrary {
  projects: DiagramProject[];
  activeId: string | null;
}

/**
 * Lee los proyectos guardados. Si encuentra el formato anterior (solo el proyecto
 * activo), lo incorpora a la lista como abierto; `writeProjectLibrary` borra
 * después esa clave. Los datos ilegibles se ignoran en lugar de romper la app.
 */
export function readProjectLibrary(storage: KeyValueStorage): ProjectLibrary {
  const stored = parseJson(storage.getItem(PROJECTS_KEY));
  const projects = (Array.isArray(stored) ? stored : []).map(parseStoredProject).filter((project) => project !== null);
  let activeId = storage.getItem(ACTIVE_KEY);

  const legacy = parseStoredProject(parseJson(storage.getItem(LEGACY_ACTIVE_KEY)));
  if (legacy) {
    // La clave vieja es la versión más reciente de ese proyecto.
    const index = projects.findIndex((project) => project.id === legacy.id);
    if (index === -1) projects.push(legacy);
    else projects[index] = legacy;
    activeId = legacy.id;
  }

  if (activeId && !projects.some((project) => project.id === activeId)) activeId = null;
  return { projects, activeId };
}

/** Guarda la lista completa y el activo. Los errores (p. ej. almacenamiento lleno) se propagan. */
export function writeProjectLibrary(storage: KeyValueStorage, library: ProjectLibrary): void {
  storage.setItem(PROJECTS_KEY, JSON.stringify(library.projects));
  if (library.activeId) storage.setItem(ACTIVE_KEY, library.activeId);
  else storage.removeItem(ACTIVE_KEY);
  storage.removeItem(LEGACY_ACTIVE_KEY);
}

function parseJson(raw: string | null): unknown {
  try {
    return JSON.parse(raw ?? 'null');
  } catch {
    return null;
  }
}

/** Un proyecto guardado, o null si no tiene lo mínimo (id, nombre, lista de diagramas). */
export function parseStoredProject(raw: unknown): DiagramProject | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string' || !Array.isArray(raw.diagramIds)) return null;
  return {
    id: raw.id,
    name: raw.name,
    diagramIds: raw.diagramIds.filter((id): id is string => typeof id === 'string'),
    traceLinks: Array.isArray(raw.traceLinks) ? raw.traceLinks.filter(isTraceLink) : [],
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEndpoint(value: unknown): value is TraceEndpoint {
  return isRecord(value) && typeof value.diagramId === 'string' && typeof value.elementId === 'string' && (value.kind === 'node' || value.kind === 'edge');
}

function isTraceLink(value: unknown): value is TraceLink {
  return isRecord(value) && typeof value.id === 'string' && isEndpoint(value.source) && isEndpoint(value.target)
    && ['detalla', 'implementa', 'verifica', 'depende de', 'relacionado con'].includes(String(value.relation))
    && typeof value.createdAt === 'string';
}
