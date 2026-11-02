import { create } from 'zustand';

export type CanvasViewMode = 'all' | 'primary' | 'alternative' | 'integration';
export type CanvasDetailMode = 'auto' | 'full' | 'compact';

interface CanvasViewState {
  mode: CanvasViewMode;
  detail: CanvasDetailMode;
  focus: boolean;
  setMode: (mode: CanvasViewMode) => void;
  setDetail: (detail: CanvasDetailMode) => void;
  setFocus: (focus: boolean) => void;
  reset: () => void;
}

export const useCanvasViewStore = create<CanvasViewState>()((set) => ({
  mode: 'all',
  detail: 'auto',
  focus: false,
  setMode: (mode) => set({ mode }),
  setDetail: (detail) => set({ detail }),
  setFocus: (focus) => set({ focus }),
  reset: () => set({ mode: 'all', detail: 'auto', focus: false }),
}));
