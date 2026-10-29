import { create } from 'zustand';
import type { Severity } from '@/core/model';

/** Color del resaltado: la gravedad de un problema, o 'focus' para señalar sin juzgar (narración). */
export type HighlightTone = Severity | 'focus';

/** Elementos resaltados en el lienzo (al hacer clic en un problema o en una línea de la narración). */
export interface Highlight {
  /**
   * Identifica qué lo originó, con un prefijo por origen ("issue:…", "narration:…"),
   * para que cada panel solo quite los resaltados que él mismo puso.
   */
  sourceKey: string;
  tone: HighlightTone;
  nodeIds: string[];
  edgeIds: string[];
}

interface HighlightState {
  highlight: Highlight | null;
  setHighlight: (highlight: Highlight | null) => void;
}

/** Vive en canvas/ porque es estado de lo que el lienzo pinta; la UI solo lo pide. */
export const useHighlightStore = create<HighlightState>()((set) => ({
  highlight: null,
  setHighlight: (highlight) => set({ highlight }),
}));
