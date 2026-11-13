import { create } from 'zustand';
import { moveDiagramInOrder, withoutDiagrams, type DiagramProject, type TraceEndpoint, type TraceLink, type TraceRelation } from '@/core/model';
import { browserStorage } from '@/core/persistence/diagramRepository';
import { readProjectLibrary, writeProjectLibrary, type ProjectLibrary } from '@/core/persistence/projectLibrary';
import { createId } from '@/core/utils/id';

interface ProjectState {
  /** Proyecto abierto, o null si no hay ninguno. */
  project: DiagramProject | null;
  /** Todos los proyectos guardados en este navegador, incluido el abierto. */
  projects: DiagramProject[];
  /** Crea un proyecto, lo guarda y lo abre. */
  createProject: (name: string, firstDiagramId?: string) => void;
  /** Guarda y abre un proyecto que llega de fuera (p. ej. un archivo importado). */
  openProject: (project: DiagramProject) => void;
  /** Abre otro de los proyectos guardados. */
  switchProject: (projectId: string) => void;
  /** Cierra el proyecto abierto; sigue guardado. */
  closeProject: () => void;
  /** Borra un proyecto guardado (su nombre, orden y trazabilidad); sus diagramas siguen guardados. */
  deleteProject: (projectId: string) => void;
  renameProject: (name: string) => void;
  addDiagram: (diagramId: string) => void;
  removeDiagram: (diagramId: string) => void;
  /**
   * Quita de todos los proyectos los diagramas que ya no están guardados (p. ej. se
   * borraron desde «Tus diagramas»), con sus vínculos. `savedIds`: los ids guardados.
   */
  forgetMissingDiagrams: (savedIds: ReadonlySet<string>) => void;
  /** Cambia el lugar de un diagrama en el orden del proyecto abierto. */
  moveDiagram: (diagramId: string, toIndex: number) => void;
  addTraceLink: (source: TraceEndpoint, target: TraceEndpoint, relation: TraceRelation) => void;
  removeTraceLink: (linkId: string) => void;
}

/** null en modo privado o con el almacenamiento bloqueado: los proyectos duran solo la sesión. */
const storage = browserStorage();

function loadLibrary(): ProjectLibrary {
  if (!storage) return { projects: [], activeId: null };
  const library = readProjectLibrary(storage);
  save(library); // Completa al momento la migración desde el formato anterior.
  return library;
}

function save(library: ProjectLibrary): void {
  if (!storage) return;
  try {
    writeProjectLibrary(storage, library);
  } catch {
    // Almacenamiento lleno o bloqueado: los proyectos siguen disponibles durante la sesión.
  }
}

/** Estado del store a partir de la biblioteca, guardándola: único punto por el que pasan los cambios. */
function commit(projects: DiagramProject[], activeId: string | null): Pick<ProjectState, 'project' | 'projects'> {
  save({ projects, activeId });
  return { projects, project: projects.find((project) => project.id === activeId) ?? null };
}

const update = (project: DiagramProject, patch: Partial<DiagramProject>): DiagramProject => ({ ...project, ...patch, updatedAt: new Date().toISOString() });

/**
 * Aplica un cambio al proyecto abierto. `change` devuelve qué cambiar, o null si
 * no hay nada que hacer (entonces el estado no se toca ni se guarda).
 */
function changeActive(state: ProjectState, change: (project: DiagramProject) => Partial<DiagramProject> | null): Partial<ProjectState> {
  if (!state.project) return state;
  const patch = change(state.project);
  if (!patch) return state;
  const changed = update(state.project, patch);
  return commit(state.projects.map((project) => (project.id === changed.id ? changed : project)), changed.id);
}

const initial = loadLibrary();

export const useProjectStore = create<ProjectState>()((set) => ({
  projects: initial.projects,
  project: initial.projects.find((project) => project.id === initial.activeId) ?? null,

  createProject: (name, firstDiagramId) => set((state) => {
    const now = new Date().toISOString();
    const project: DiagramProject = { id: createId(), name: name.trim() || 'Proyecto sin título', diagramIds: firstDiagramId ? [firstDiagramId] : [], traceLinks: [], createdAt: now, updatedAt: now };
    return commit([...state.projects, project], project.id);
  }),
  openProject: (project) => set((state) => commit([...state.projects.filter((other) => other.id !== project.id), project], project.id)),
  switchProject: (projectId) => set((state) => (state.projects.some((project) => project.id === projectId) ? commit(state.projects, projectId) : state)),
  closeProject: () => set((state) => commit(state.projects, null)),
  deleteProject: (projectId) => set((state) => {
    const activeId = state.project?.id === projectId ? null : (state.project?.id ?? null);
    return commit(state.projects.filter((project) => project.id !== projectId), activeId);
  }),

  renameProject: (name) => set((state) => changeActive(state, () => ({ name: name.trim() || 'Proyecto sin título' }))),
  addDiagram: (diagramId) => set((state) => changeActive(state, (project) => (project.diagramIds.includes(diagramId) ? null : { diagramIds: [...project.diagramIds, diagramId] }))),
  removeDiagram: (diagramId) => set((state) => changeActive(state, (project) => withoutDiagrams(project, new Set([diagramId])))),
  forgetMissingDiagrams: (savedIds) => set((state) => {
    let changed = false;
    const projects = state.projects.map((project) => {
      const remaining = withoutDiagrams(project, new Set(project.diagramIds.filter((id) => !savedIds.has(id))));
      if (!remaining) return project;
      changed = true;
      return update(project, remaining);
    });
    return changed ? commit(projects, state.project?.id ?? null) : state;
  }),
  moveDiagram: (diagramId, toIndex) => set((state) => changeActive(state, (project) => {
    const diagramIds = moveDiagramInOrder(project.diagramIds, diagramId, toIndex);
    return diagramIds.every((id, index) => id === project.diagramIds[index]) ? null : { diagramIds };
  })),
  addTraceLink: (source, target, relation) => set((state) => changeActive(state, (project) => {
    if (source.diagramId === target.diagramId && source.elementId === target.elementId) return null;
    const duplicate = project.traceLinks.some((link) =>
      link.source.diagramId === source.diagramId && link.source.elementId === source.elementId
      && link.target.diagramId === target.diagramId && link.target.elementId === target.elementId
      && link.relation === relation,
    );
    if (duplicate) return null;
    const link: TraceLink = { id: createId(), source, target, relation, createdAt: new Date().toISOString() };
    return { traceLinks: [...project.traceLinks, link] };
  })),
  removeTraceLink: (linkId) => set((state) => changeActive(state, (project) => ({ traceLinks: project.traceLinks.filter((link) => link.id !== linkId) }))),
}));
