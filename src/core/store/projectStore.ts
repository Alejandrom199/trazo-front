import { create } from 'zustand';
import {
  moveDiagramInOrder,
  nextRequirementCode,
  nextTestCaseCode,
  requirementDefaults,
  withoutDiagrams,
  type DiagramProject,
  type DiagramRelation,
  type ProjectIssueFix,
  type Requirement,
  type RequirementKind,
  type RequirementLink,
  type TestCase,
  type ProjectDocument,
  emptyProjectDocument,
  type TraceEndpoint,
  type TraceLink,
  type TraceRelation,
} from '@/core/model';
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
  /** Renombra el proyecto abierto, o el guardado con `projectId`. */
  renameProject: (name: string, projectId?: string) => void;
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
  /** Reemplaza los vínculos por los que devuelve `change` (p. ej. el arreglo de un problema de proyecto). */
  /** Aplica el arreglo de un clic de un problema de proyecto. */
  applyProjectFix: (fix: ProjectIssueFix) => void;
  /** Crea un requisito con el siguiente código de su tipo y devuelve su id (null sin proyecto). */
  addRequirement: (kind: RequirementKind, title?: string) => string | null;
  updateRequirement: (requirementId: string, patch: Partial<Omit<Requirement, 'id' | 'createdAt'>>) => void;
  /** Borra el requisito y sus vínculos. */
  deleteRequirement: (requirementId: string) => void;
  /** Vincula un requisito con un elemento (o con el diagrama completo, con elementId null). No repite. */
  linkRequirement: (requirementId: string, diagramId: string, elementId: string | null) => void;
  unlinkRequirement: (linkId: string) => void;
  /** Guarda un camino como caso de prueba con el siguiente código (CP-01…) y devuelve su id (null si el diagrama no es del proyecto). */
  addTestCase: (draft: Pick<TestCase, 'diagramId' | 'choices' | 'title' | 'given' | 'when' | 'then'>) => string | null;
  updateTestCase: (testCaseId: string, patch: Partial<Omit<TestCase, 'id' | 'diagramId' | 'createdAt'>>) => void;
  deleteTestCase: (testCaseId: string) => void;
  /** Cambia datos del documento ERS (problema, audiencia, glosario…). */
  updateDocument: (patch: Partial<ProjectDocument>) => void;
  /** Crea una carpeta al final y devuelve su id (null sin proyecto abierto). */
  createFolder: (name: string) => string | null;
  renameFolder: (folderId: string, name: string) => void;
  /** Borra la carpeta; sus diagramas siguen en el proyecto, sin carpeta. */
  deleteFolder: (folderId: string) => void;
  /** Mete un diagrama en una carpeta (o lo saca, con null). */
  moveDiagramToFolder: (diagramId: string, folderId: string | null) => void;
  /** Relaciona dos diagramas completos; no repite una relación igual ni une un diagrama consigo mismo. */
  addDiagramRelation: (sourceDiagramId: string, targetDiagramId: string, relation: TraceRelation) => void;
  removeDiagramRelation: (relationId: string) => void;
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
    const project: DiagramProject = { id: createId(), name: name.trim() || 'Proyecto sin título', diagramIds: firstDiagramId ? [firstDiagramId] : [], traceLinks: [], folders: [], folderOf: {}, diagramRelations: [], requirements: [], requirementLinks: [], testCases: [], createdAt: now, updatedAt: now };
    return commit([...state.projects, project], project.id);
  }),
  openProject: (project) => set((state) => commit([...state.projects.filter((other) => other.id !== project.id), project], project.id)),
  switchProject: (projectId) => set((state) => (state.projects.some((project) => project.id === projectId) ? commit(state.projects, projectId) : state)),
  closeProject: () => set((state) => commit(state.projects, null)),
  deleteProject: (projectId) => set((state) => {
    const activeId = state.project?.id === projectId ? null : (state.project?.id ?? null);
    return commit(state.projects.filter((project) => project.id !== projectId), activeId);
  }),

  renameProject: (name, projectId) => set((state) => {
    const targetId = projectId ?? state.project?.id;
    const target = state.projects.find((project) => project.id === targetId);
    const trimmed = name.trim() || 'Proyecto sin título';
    if (!target || target.name === trimmed) return state;
    return commit(state.projects.map((project) => (project.id === target.id ? update(project, { name: trimmed }) : project)), state.project?.id ?? null);
  }),
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
  createFolder: (name) => {
    const id = createId();
    let created = false;
    set((state) => changeActive(state, (project) => {
      created = true;
      return { folders: [...project.folders, { id, name: name.trim() || 'Carpeta nueva' }] };
    }));
    return created ? id : null;
  },
  renameFolder: (folderId, name) => set((state) => changeActive(state, (project) => {
    const trimmed = name.trim();
    if (!trimmed || !project.folders.some((folder) => folder.id === folderId && folder.name !== trimmed)) return null;
    return { folders: project.folders.map((folder) => (folder.id === folderId ? { ...folder, name: trimmed } : folder)) };
  })),
  deleteFolder: (folderId) => set((state) => changeActive(state, (project) => {
    if (!project.folders.some((folder) => folder.id === folderId)) return null;
    return {
      folders: project.folders.filter((folder) => folder.id !== folderId),
      folderOf: Object.fromEntries(Object.entries(project.folderOf).filter(([, id]) => id !== folderId)),
    };
  })),
  moveDiagramToFolder: (diagramId, folderId) => set((state) => changeActive(state, (project) => {
    if (!project.diagramIds.includes(diagramId) || (project.folderOf[diagramId] ?? null) === folderId) return null;
    if (folderId && !project.folders.some((folder) => folder.id === folderId)) return null;
    const { [diagramId]: _previous, ...rest } = project.folderOf;
    return { folderOf: folderId ? { ...rest, [diagramId]: folderId } : rest };
  })),
  addDiagramRelation: (sourceDiagramId, targetDiagramId, relation) => set((state) => changeActive(state, (project) => {
    if (sourceDiagramId === targetDiagramId) return null;
    if (![sourceDiagramId, targetDiagramId].every((id) => project.diagramIds.includes(id))) return null;
    const duplicate = project.diagramRelations.some((item) =>
      item.sourceDiagramId === sourceDiagramId && item.targetDiagramId === targetDiagramId && item.relation === relation);
    if (duplicate) return null;
    const created: DiagramRelation = { id: createId(), sourceDiagramId, targetDiagramId, relation, createdAt: new Date().toISOString() };
    return { diagramRelations: [...project.diagramRelations, created] };
  })),
  removeDiagramRelation: (relationId) => set((state) => changeActive(state, (project) =>
    (project.diagramRelations.some((item) => item.id === relationId) ? { diagramRelations: project.diagramRelations.filter((item) => item.id !== relationId) } : null))),
  applyProjectFix: (fix) => set((state) => changeActive(state, (project) => {
    const patch = fix.apply({ traceLinks: project.traceLinks, requirementLinks: project.requirementLinks });
    return Object.keys(patch).length > 0 ? patch : null;
  })),
  addRequirement: (kind, title = '') => {
    const id = createId();
    let created = false;
    set((state) => changeActive(state, (project) => {
      created = true;
      const requirement: Requirement = { ...requirementDefaults(), id, code: nextRequirementCode(project.requirements, kind), title: title.trim() || 'Requisito nuevo', kind, createdAt: new Date().toISOString() };
      return { requirements: [...project.requirements, requirement] };
    }));
    return created ? id : null;
  },
  updateRequirement: (requirementId, patch) => set((state) => changeActive(state, (project) => {
    const current = project.requirements.find((item) => item.id === requirementId);
    if (!current) return null;
    const next = { ...current, ...patch, code: patch.code?.trim() || current.code, title: patch.title !== undefined ? patch.title.trim() || current.title : current.title };
    if (Object.entries(next).every(([key, value]) => current[key as keyof Requirement] === value)) return null;
    return { requirements: project.requirements.map((item) => (item.id === requirementId ? next : item)) };
  })),
  deleteRequirement: (requirementId) => set((state) => changeActive(state, (project) => {
    if (!project.requirements.some((item) => item.id === requirementId)) return null;
    return {
      requirements: project.requirements.filter((item) => item.id !== requirementId),
      requirementLinks: project.requirementLinks.filter((link) => link.requirementId !== requirementId),
      testCases: project.testCases.map((item) => (item.requirementIds.includes(requirementId) ? { ...item, requirementIds: item.requirementIds.filter((id) => id !== requirementId) } : item)),
    };
  })),
  linkRequirement: (requirementId, diagramId, elementId) => set((state) => changeActive(state, (project) => {
    if (!project.requirements.some((item) => item.id === requirementId) || !project.diagramIds.includes(diagramId)) return null;
    if (project.requirementLinks.some((link) => link.requirementId === requirementId && link.diagramId === diagramId && link.elementId === elementId)) return null;
    const link: RequirementLink = { id: createId(), requirementId, diagramId, elementId, createdAt: new Date().toISOString() };
    return { requirementLinks: [...project.requirementLinks, link] };
  })),
  unlinkRequirement: (linkId) => set((state) => changeActive(state, (project) =>
    (project.requirementLinks.some((link) => link.id === linkId) ? { requirementLinks: project.requirementLinks.filter((link) => link.id !== linkId) } : null))),
  addTestCase: (draft) => {
    const id = createId();
    let created = false;
    set((state) => changeActive(state, (project) => {
      if (!project.diagramIds.includes(draft.diagramId)) return null;
      created = true;
      const testCase: TestCase = { ...draft, id, code: nextTestCaseCode(project.testCases), requirementIds: [], status: 'pendiente', createdAt: new Date().toISOString() };
      return { testCases: [...project.testCases, testCase] };
    }));
    return created ? id : null;
  },
  updateTestCase: (testCaseId, patch) => set((state) => changeActive(state, (project) => {
    const current = project.testCases.find((item) => item.id === testCaseId);
    if (!current) return null;
    const next = { ...current, ...patch, code: patch.code?.trim() || current.code };
    if (Object.entries(next).every(([key, value]) => current[key as keyof TestCase] === value)) return null;
    return { testCases: project.testCases.map((item) => (item.id === testCaseId ? next : item)) };
  })),
  updateDocument: (patch) => set((state) => changeActive(state, (project) => ({ document: { ...(project.document ?? emptyProjectDocument()), ...patch } }))),
  deleteTestCase: (testCaseId) => set((state) => changeActive(state, (project) =>
    (project.testCases.some((item) => item.id === testCaseId) ? { testCases: project.testCases.filter((item) => item.id !== testCaseId) } : null))),
}));
