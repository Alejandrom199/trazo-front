import { create } from 'zustand';

const LEARNING_MODE_KEY = 'trazo.learningMode';

/**
 * Preferencias de la interfaz (no forman parte del diagrama ni del historial).
 * El modo aprendizaje se recuerda en el navegador; si el almacenamiento no está
 * disponible (modo privado, bloqueado), simplemente arranca activado.
 */
interface UiState {
  /** Activado: el panel de explicación se abre solo al seleccionar algo. */
  learningMode: boolean;
  setLearningMode: (enabled: boolean) => void;
  /** Galería de plantillas: se muestra al abrir la app y con "Nuevo". */
  galleryOpen: boolean;
  setGalleryOpen: (open: boolean) => void;
  /** Panel "Explicar diagrama": ocupa el lugar del panel de explicación mientras está abierto. */
  narrationOpen: boolean;
  setNarrationOpen: (open: boolean) => void;
  /** Aviso breve para el usuario (p. ej. un archivo que no se pudo importar). */
  notice: string | null;
  showNotice: (message: string) => void;
}

const NOTICE_DURATION_MS = 4000;
let noticeTimer: ReturnType<typeof setTimeout> | undefined;

function readLearningMode(): boolean {
  try {
    return localStorage.getItem(LEARNING_MODE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export const useUiStore = create<UiState>()((set) => ({
  learningMode: readLearningMode(),
  setLearningMode: (enabled) => {
    try {
      localStorage.setItem(LEARNING_MODE_KEY, String(enabled));
    } catch {
      // Sin almacenamiento la preferencia dura solo esta sesión.
    }
    set({ learningMode: enabled });
  },
  galleryOpen: true,
  setGalleryOpen: (open) => set({ galleryOpen: open }),
  narrationOpen: false,
  setNarrationOpen: (open) => set({ narrationOpen: open }),
  notice: null,
  showNotice: (message) => {
    clearTimeout(noticeTimer);
    set({ notice: message });
    noticeTimer = setTimeout(() => set({ notice: null }), NOTICE_DURATION_MS);
  },
}));
