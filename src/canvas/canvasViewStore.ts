import { create } from 'zustand';

/**
 * Cómo se ve el lienzo al alejarse:
 *   auto: por debajo de cierto zoom se ocultan los textos de las flechas y se atenúan las notas.
 *   full: siempre todo el detalle.  compact: siempre el detalle reducido.
 */
export type CanvasDetailMode = 'auto' | 'full' | 'compact';

const DETAIL_KEY = 'trazo.viewDetail';
const DETAIL_MODES: readonly CanvasDetailMode[] = ['auto', 'full', 'compact'];

interface CanvasViewState {
  /** Preferencia del usuario: se recuerda en el navegador. */
  detail: CanvasDetailMode;
  /** Enfocar selección: atenúa lo que no está conectado con lo seleccionado. Depende del diagrama: no se recuerda. */
  focus: boolean;
  setDetail: (detail: CanvasDetailMode) => void;
  setFocus: (focus: boolean) => void;
  /** Al abrir otro diagrama: se apaga el enfoque; el nivel de detalle se conserva. */
  reset: () => void;
}

function readDetail(): CanvasDetailMode {
  try {
    const saved = localStorage.getItem(DETAIL_KEY);
    if (DETAIL_MODES.includes(saved as CanvasDetailMode)) return saved as CanvasDetailMode;
  } catch {
    // Sin almacenamiento: valor por defecto.
  }
  return 'auto';
}

export const useCanvasViewStore = create<CanvasViewState>()((set) => ({
  detail: readDetail(),
  focus: false,
  setDetail: (detail) => {
    try {
      localStorage.setItem(DETAIL_KEY, detail);
    } catch {
      // Sin almacenamiento la preferencia dura solo esta sesión.
    }
    set({ detail });
  },
  setFocus: (focus) => set({ focus }),
  reset: () => set({ focus: false }),
}));
