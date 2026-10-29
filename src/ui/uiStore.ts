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
}

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
}));
