import { create } from 'zustand';

/**
 * Herramienta activa del lienzo:
 *   hand: solo desplaza la vista (no selecciona ni mueve nada).
 *   pointer: clic para seleccionar, arrastrar nodos; sobre el fondo, recuadro de selección.
 *   lasso: el lápiz; dibuja a mano alzada el área que se selecciona.
 */
export type CanvasTool = 'hand' | 'pointer' | 'lasso';

interface CanvasInteractionState {
  tool: CanvasTool;
  setTool: (tool: CanvasTool) => void;
}

export const useCanvasInteractionStore = create<CanvasInteractionState>((set) => ({
  tool: 'pointer',
  setTool: (tool) => set({ tool }),
}));
