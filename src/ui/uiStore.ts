import { create } from 'zustand';

const THEME_KEY = 'trazo.theme';
const PALETTE_COLLAPSED_KEY = 'trazo.paletteCollapsed';
/** Por debajo de este ancho la paleta arranca plegada (si el usuario no eligió antes). */
const NARROW_SCREEN = 1024;

export type Theme = 'light' | 'dark';

/**
 * Preferencias de la interfaz (no forman parte del diagrama ni del historial).
 * Las que se recuerdan usan el almacenamiento del navegador; si no está
 * disponible (modo privado, bloqueado), se usan valores por defecto.
 */
interface UiState {
  /** Tema visual; se aplica como data-theme en <html> y lo leen las variables de index.css. */
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Galería de plantillas: se muestra al abrir la app y con "Nuevo". */
  galleryOpen: boolean;
  setGalleryOpen: (open: boolean) => void;
  /** Paleta de artefactos plegada a una columna de miniaturas. */
  paletteCollapsed: boolean;
  setPaletteCollapsed: (collapsed: boolean) => void;
  /** Panel "Explicar diagrama": ocupa el lugar del panel de explicación mientras está abierto. */
  narrationOpen: boolean;
  setNarrationOpen: (open: boolean) => void;
  /** Pestaña del popup del lienzo; se recuerda para el siguiente elemento que se clique. */
  popoverTab: PopoverTab;
  setPopoverTab: (tab: PopoverTab) => void;
  /** Aviso breve para el usuario (p. ej. un archivo que no se pudo importar). */
  notice: string | null;
  showNotice: (message: string) => void;
}

export type PopoverTab = 'properties' | 'explanation';

const NOTICE_DURATION_MS = 4000;
let noticeTimer: ReturnType<typeof setTimeout> | undefined;

/** Tema guardado; si no hay, el del sistema operativo. */
function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Sin almacenamiento: se usa la preferencia del sistema.
  }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme;
}

function readPaletteCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(PALETTE_COLLAPSED_KEY);
    if (saved === 'true' || saved === 'false') return saved === 'true';
  } catch {
    // Sin almacenamiento: se decide por el ancho de la pantalla.
  }
  return typeof window !== 'undefined' && window.innerWidth < NARROW_SCREEN;
}

const initialTheme = readTheme();
applyTheme(initialTheme);

export const useUiStore = create<UiState>()((set) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Sin almacenamiento el tema dura solo esta sesión.
    }
    set({ theme });
  },
  galleryOpen: true,
  setGalleryOpen: (open) => set({ galleryOpen: open }),
  paletteCollapsed: readPaletteCollapsed(),
  setPaletteCollapsed: (collapsed) => {
    try {
      localStorage.setItem(PALETTE_COLLAPSED_KEY, String(collapsed));
    } catch {
      // Sin almacenamiento la preferencia dura solo esta sesión.
    }
    set({ paletteCollapsed: collapsed });
  },
  narrationOpen: false,
  setNarrationOpen: (open) => set({ narrationOpen: open }),
  popoverTab: 'properties',
  setPopoverTab: (tab) => set({ popoverTab: tab }),
  notice: null,
  showNotice: (message) => {
    clearTimeout(noticeTimer);
    set({ notice: message });
    noticeTimer = setTimeout(() => set({ notice: null }), NOTICE_DURATION_MS);
  },
}));
