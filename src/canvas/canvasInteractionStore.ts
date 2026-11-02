import { create } from 'zustand';

export type CanvasTool = 'move' | 'marquee';

interface CanvasInteractionState {
  tool: CanvasTool;
  setTool: (tool: CanvasTool) => void;
}

export const useCanvasInteractionStore = create<CanvasInteractionState>((set) => ({
  tool: 'move',
  setTool: (tool) => set({ tool }),
}));
