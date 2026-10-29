import { create } from 'zustand';

/** Un clic del usuario sobre un nodo o una flecha del lienzo, con dónde ocurrió en pantalla. */
export interface ElementClick {
  kind: 'node' | 'edge';
  id: string;
  /** Rectángulo del nodo en pantalla, o del punto clicado en una flecha. */
  rect: { left: number; top: number; right: number };
}

interface ElementClickState {
  clicked: ElementClick | null;
  setClicked: (clicked: ElementClick | null) => void;
}

/**
 * El lienzo publica aquí el último elemento clicado; la UI decide qué mostrar
 * (el popup de explicación). Se limpia cuando la posición en pantalla deja de
 * valer: al arrastrar, desplazar o hacer zoom.
 */
export const useElementClickStore = create<ElementClickState>()((set) => ({
  clicked: null,
  setClicked: (clicked) => set({ clicked }),
}));
