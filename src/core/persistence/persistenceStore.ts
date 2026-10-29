import { create } from 'zustand';
import type { DiagramRepository, DiagramSummary } from './diagramRepository';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unavailable';

interface PersistenceState {
  /** null cuando el navegador no permite guardar (modo privado, almacenamiento bloqueado). */
  repository: DiagramRepository | null;
  status: SaveStatus;
  /** Diagramas guardados; se refresca tras cada guardado o borrado. */
  summaries: DiagramSummary[];
  setRepository: (repository: DiagramRepository | null) => void;
  setStatus: (status: SaveStatus) => void;
  refresh: () => void;
}

/** Estado visible del guardado: la UI lo lee para mostrar "Guardado" y la lista de diagramas. */
export const usePersistenceStore = create<PersistenceState>()((set, get) => ({
  repository: null,
  status: 'idle',
  summaries: [],
  setRepository: (repository) =>
    set({ repository, status: repository ? 'idle' : 'unavailable', summaries: repository?.list() ?? [] }),
  setStatus: (status) => set({ status }),
  refresh: () => set({ summaries: get().repository?.list() ?? [] }),
}));
