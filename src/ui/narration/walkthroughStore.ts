import { create } from 'zustand';
import type { Diagram, WalkState } from '@/core/model';

/**
 * Un nivel del recorrido: el diagrama que se está recorriendo y su historial de
 * estados (cada paso agrega uno; «Atrás» quita el último).
 */
export interface WalkFrame {
  diagramId: string;
  diagramName: string;
  history: WalkState[];
  /**
   * La versión del diagrama sobre la que se calculó el recorrido. Si el diagrama
   * abierto cambia (se edita), el recorrido queda desactualizado.
   */
  startedOn: Diagram;
}

interface WalkthroughState {
  /**
   * Pila de niveles: el primero es el proceso donde empezó el recorrido; cada
   * subproceso al que se entra agrega uno encima. Vacía si no hay recorrido.
   */
  frames: WalkFrame[];
  start: (diagram: Diagram, first: WalkState) => void;
  /** Agrega un paso al nivel actual. */
  push: (state: WalkState) => void;
  /** Quita el último paso del nivel actual (nunca el primero). */
  back: () => void;
  /** Entra a un subproceso: su diagrama pasa a ser el nivel actual. */
  enter: (diagram: Diagram, first: WalkState) => void;
  /**
   * Vuelve al nivel anterior, ya abierto en `parent` (la versión recién cargada),
   * y agrega el paso con el que continúa después del subproceso.
   */
  returnTo: (parent: Diagram, next: WalkState) => void;
  reset: () => void;
}

const replaceTop = (frames: WalkFrame[], change: (frame: WalkFrame) => WalkFrame): WalkFrame[] =>
  frames.length === 0 ? frames : [...frames.slice(0, -1), change(frames.at(-1)!)];

/**
 * Estado del recorrido paso a paso. Vive fuera del panel porque al entrar en
 * un subproceso se abre otro diagrama, y el recorrido debe seguir donde iba.
 */
export const useWalkthroughStore = create<WalkthroughState>()((set) => ({
  frames: [],
  start: (diagram, first) => set({ frames: [{ diagramId: diagram.id, diagramName: diagram.name, history: [first], startedOn: diagram }] }),
  push: (state) => set((current) => ({ frames: replaceTop(current.frames, (frame) => ({ ...frame, history: [...frame.history, state] })) })),
  back: () => set((current) => ({ frames: replaceTop(current.frames, (frame) => (frame.history.length > 1 ? { ...frame, history: frame.history.slice(0, -1) } : frame)) })),
  enter: (diagram, first) => set((current) => ({ frames: [...current.frames, { diagramId: diagram.id, diagramName: diagram.name, history: [first], startedOn: diagram }] })),
  returnTo: (parent, next) =>
    set((current) => ({
      frames: replaceTop(current.frames.slice(0, -1), (frame) => ({ ...frame, startedOn: parent, history: [...frame.history, next] })),
    })),
  reset: () => set({ frames: [] }),
}));
