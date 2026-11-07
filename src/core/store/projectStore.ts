import { create } from 'zustand';
import type { DiagramProject, TraceEndpoint, TraceLink, TraceRelation } from '@/core/model';
import { createId } from '@/core/utils/id';

const STORAGE_KEY = 'trazo.activeProject';

interface ProjectState {
  project: DiagramProject | null;
  createProject: (name: string, firstDiagramId?: string) => void;
  openProject: (project: DiagramProject) => void;
  renameProject: (name: string) => void;
  addDiagram: (diagramId: string) => void;
  removeDiagram: (diagramId: string) => void;
  addTraceLink: (source: TraceEndpoint, target: TraceEndpoint, relation: TraceRelation) => void;
  removeTraceLink: (linkId: string) => void;
  closeProject: () => void;
}

function readProject(): DiagramProject | null {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string' || !Array.isArray(raw.diagramIds)) return null;
    return {
      id: raw.id,
      name: raw.name,
      diagramIds: raw.diagramIds.filter((id): id is string => typeof id === 'string'),
      traceLinks: Array.isArray(raw.traceLinks) ? raw.traceLinks.filter(isTraceLink) : [],
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function persist(project: DiagramProject | null): void {
  try {
    if (project) localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // El proyecto sigue disponible durante la sesión aunque localStorage esté bloqueado.
  }
}

const update = (project: DiagramProject, patch: Partial<DiagramProject>): DiagramProject => ({ ...project, ...patch, updatedAt: new Date().toISOString() });

export const useProjectStore = create<ProjectState>()((set) => ({
  project: readProject(),
  createProject: (name, firstDiagramId) => {
    const now = new Date().toISOString();
    const project: DiagramProject = { id: createId(), name: name.trim() || 'Proyecto sin título', diagramIds: firstDiagramId ? [firstDiagramId] : [], traceLinks: [], createdAt: now, updatedAt: now };
    persist(project);
    set({ project });
  },
  openProject: (project) => { persist(project); set({ project }); },
  renameProject: (name) => set((state) => {
    if (!state.project) return state;
    const project = update(state.project, { name: name.trim() || 'Proyecto sin título' });
    persist(project);
    return { project };
  }),
  addDiagram: (diagramId) => set((state) => {
    if (!state.project || state.project.diagramIds.includes(diagramId)) return state;
    const project = update(state.project, { diagramIds: [...state.project.diagramIds, diagramId] });
    persist(project);
    return { project };
  }),
  removeDiagram: (diagramId) => set((state) => {
    if (!state.project) return state;
    const project = update(state.project, {
      diagramIds: state.project.diagramIds.filter((id) => id !== diagramId),
      traceLinks: state.project.traceLinks.filter((link) => link.source.diagramId !== diagramId && link.target.diagramId !== diagramId),
    });
    persist(project);
    return { project };
  }),
  addTraceLink: (source, target, relation) => set((state) => {
    if (!state.project || source.diagramId === target.diagramId && source.elementId === target.elementId) return state;
    const duplicate = state.project.traceLinks.some((link) =>
      link.source.diagramId === source.diagramId && link.source.elementId === source.elementId
      && link.target.diagramId === target.diagramId && link.target.elementId === target.elementId
      && link.relation === relation,
    );
    if (duplicate) return state;
    const link: TraceLink = { id: createId(), source, target, relation, createdAt: new Date().toISOString() };
    const project = update(state.project, { traceLinks: [...state.project.traceLinks, link] });
    persist(project);
    return { project };
  }),
  removeTraceLink: (linkId) => set((state) => {
    if (!state.project) return state;
    const project = update(state.project, { traceLinks: state.project.traceLinks.filter((link) => link.id !== linkId) });
    persist(project);
    return { project };
  }),
  closeProject: () => { persist(null); set({ project: null }); },
}));

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
