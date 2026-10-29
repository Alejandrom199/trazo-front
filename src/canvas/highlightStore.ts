import { create } from 'zustand';
import type { Severity } from '@/core/model';

/** Elementos resaltados en el lienzo (p. ej. al hacer clic en un problema de validación). */
export interface Highlight {
  /** Identifica qué lo originó, para poder quitarlo cuando ese origen desaparece. */
  sourceKey: string;
  severity: Severity;
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
