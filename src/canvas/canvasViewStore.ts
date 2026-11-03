import { create } from 'zustand';

/**
 * Cómo se ve el lienzo al alejarse:
 *   auto: por debajo de cierto zoom se ocultan los textos de las flechas y se atenúan las notas.
 *   full: siempre todo el detalle.  compact: siempre el detalle reducido.
 */
export type CanvasDetailMode = 'auto' | 'full' | 'compact';

interface CanvasViewState {
  detail: CanvasDetailMode;
  /** Enfocar selección: atenúa lo que no está conectado con lo seleccionado. */
  focus: boolean;
  setDetail: (detail: CanvasDetailMode) => void;
  setFocus: (focus: boolean) => void;
  reset: () => void;
}

export const useCanvasViewStore = create<CanvasViewState>()((set) => ({
  detail: 'auto',
  focus: false,
  setDetail: (detail) => set({ detail }),
  setFocus: (focus) => set({ focus }),
  reset: () => set({ detail: 'auto', focus: false }),
}));
