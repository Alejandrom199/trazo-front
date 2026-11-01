import { create } from 'zustand';
import type { Position } from '@/core/model';

/** Sobre qué se pidió el menú: el fondo del lienzo, un nodo o una flecha. */
export type ContextMenuTarget = { kind: 'pane' } | { kind: 'node' | 'edge'; id: string };

export interface CanvasContextMenu {
  target: ContextMenuTarget;
  /** Dónde se abre, en pantalla. */
  screen: Position;
  /**
   * Punto del lienzo donde se agregará lo que se elija. null = el centro de la
   * vista (cuando el menú se abre desde un botón y no con clic derecho).
   */
  flow: Position | null;
}

interface ContextMenuState {
  menu: CanvasContextMenu | null;
  open: (menu: CanvasContextMenu) => void;
  close: () => void;
}

/**
 * El lienzo publica aquí cada clic derecho; la UI decide qué menú mostrar.
 * Se cierra al desplazar o hacer zoom, porque el punto deja de valer.
 */
export const useContextMenuStore = create<ContextMenuState>()((set) => ({
  menu: null,
  open: (menu) => set({ menu }),
  close: () => set({ menu: null }),
}));
