import { create } from 'zustand';
import { createEmptyDiagram, type Diagram, type NewDiagramInput } from '@/core/model';

interface DiagramState {
  /** Diagrama abierto en el editor, o null si no hay ninguno. */
  diagram: Diagram | null;
  newDiagram: (input: NewDiagramInput) => void;
  openDiagram: (diagram: Diagram) => void;
  renameDiagram: (name: string) => void;
}

/**
 * Estado global del editor. En fases siguientes se agregan las acciones
 * sobre nodos/conexiones y el historial de deshacer/rehacer.
 */
export const useDiagramStore = create<DiagramState>()((set) => ({
  diagram: null,

  newDiagram: (input) => set({ diagram: createEmptyDiagram(input) }),

  openDiagram: (diagram) => set({ diagram }),

  renameDiagram: (name) =>
    set((state) =>
      state.diagram
        ? { diagram: { ...state.diagram, name, updatedAt: new Date().toISOString() } }
        : state,
    ),
}));
