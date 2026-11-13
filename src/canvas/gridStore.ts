import { create } from 'zustand';

const GRID_KEY = 'trazo.grid';

export const GRID_SIZE_MIN = 5;
export const GRID_SIZE_MAX = 100;
const DEFAULT_GRID = { visible: false, size: 20 };

interface GridState {
  /** Cuadrícula visible; mientras lo está, los nodos se ajustan a sus celdas. */
  visible: boolean;
  /** Lado de cada celda, en píxeles del lienzo. */
  size: number;
  setVisible: (visible: boolean) => void;
  setSize: (size: number) => void;
}

/** Preferencia de vista: se recuerda en el navegador, no forma parte del diagrama. */
function readGrid(): { visible: boolean; size: number } {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(GRID_KEY) ?? 'null');
    if (parsed && typeof parsed === 'object' && 'visible' in parsed && 'size' in parsed) {
      const { visible, size } = parsed as { visible: unknown; size: unknown };
      if (typeof visible === 'boolean' && typeof size === 'number') return { visible, size: clampGridSize(size) };
    }
  } catch {
    // Sin almacenamiento o dato corrupto: valores por defecto.
  }
  return DEFAULT_GRID;
}

function saveGrid(grid: { visible: boolean; size: number }): void {
  try {
    localStorage.setItem(GRID_KEY, JSON.stringify(grid));
  } catch {
    // Sin almacenamiento la preferencia dura solo esta sesión.
  }
}

export function clampGridSize(size: number): number {
  return Math.min(GRID_SIZE_MAX, Math.max(GRID_SIZE_MIN, Math.round(size)));
}

/** Ajusta un punto del lienzo a la cuadrícula si está visible; si no, al píxel. */
export function snapPoint(point: { x: number; y: number }): { x: number; y: number } {
  const { visible, size } = useGridStore.getState();
  const step = visible ? size : 1;
  return { x: Math.round(point.x / step) * step, y: Math.round(point.y / step) * step };
}

export const useGridStore = create<GridState>()((set, get) => ({
  ...readGrid(),
  setVisible: (visible) => {
    saveGrid({ visible, size: get().size });
    set({ visible });
  },
  setSize: (size) => {
    const clamped = clampGridSize(size);
    saveGrid({ visible: get().visible, size: clamped });
    set({ size: clamped });
  },
}));
