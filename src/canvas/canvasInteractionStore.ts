import { create } from 'zustand';

/**
 * Herramienta activa del lienzo (con cualquiera, mantener Alt y arrastrar desplaza la vista):
 *   hand: solo desplaza la vista; no selecciona, no mueve ni abre popups.
 *   pointer: clic para seleccionar, arrastrar nodos; sobre el fondo, recuadro de selección.
 *   lasso: el lápiz; dibuja a mano alzada el área que se selecciona.
 */
export type CanvasTool = 'hand' | 'pointer' | 'lasso';

interface CanvasInteractionState {
  tool: CanvasTool;
  setTool: (tool: CanvasTool) => void;
  /**
   * Tipo de conexión elegido en la paleta para las próximas flechas; null = se
   * deduce solo (resolveConnection). Solo se usa si es válido entre esos nodos.
   */
  nextEdgeType: string | null;
  setNextEdgeType: (edgeType: string | null) => void;
}

export const useCanvasInteractionStore = create<CanvasInteractionState>((set) => ({
  tool: 'pointer',
  setTool: (tool) => set({ tool }),
  nextEdgeType: null,
  setNextEdgeType: (nextEdgeType) => set({ nextEdgeType }),
}));
