import { create } from 'zustand';

/**
 * Herramienta activa del lienzo (con cualquiera, mantener Alt y arrastrar desplaza la vista):
 *   pointer: clic para seleccionar, arrastrar nodos; sobre el fondo, recuadro de selección.
 *   lasso: el lápiz; dibuja a mano alzada el área que se selecciona.
 */
export type CanvasTool = 'pointer' | 'lasso';

interface CanvasInteractionState {
  tool: CanvasTool;
  setTool: (tool: CanvasTool) => void;
}

export const useCanvasInteractionStore = create<CanvasInteractionState>((set) => ({
  tool: 'pointer',
  setTool: (tool) => set({ tool }),
}));
