import { create } from 'zustand';

const THEME_KEY = 'trazo.theme';
const RECENT_ARTIFACTS_KEY = 'trazo.recentArtifacts';
const ARTIFACT_TOOLS_KEY = 'trazo.artifactToolsVisible';
/** Cuántos artefactos usados recientemente se recuerdan. */
const MAX_RECENT_ARTIFACTS = 4;

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
  /** Selector para crear, reabrir o explorar ejemplos: se muestra al abrir la app y con "Nuevo". */
  galleryOpen: boolean;
  setGalleryOpen: (open: boolean) => void;
  /** Tira de herramientas de artefactos sobre el lienzo: visible hasta que el usuario la oculte (botón o tecla A). */
  artifactToolsVisible: boolean;
  setArtifactToolsVisible: (visible: boolean) => void;
  /** Últimos artefactos agregados (más reciente primero); el menú del lienzo los ofrece primero. */
  recentArtifacts: string[];
  rememberArtifact: (artifactType: string) => void;
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

function readArtifactToolsVisible(): boolean {
  try {
    return localStorage.getItem(ARTIFACT_TOOLS_KEY) !== 'false';
  } catch {
    return true;
  }
}

function readRecentArtifacts(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(RECENT_ARTIFACTS_KEY) ?? '[]');
    if (Array.isArray(saved)) return saved.filter((type): type is string => typeof type === 'string').slice(0, MAX_RECENT_ARTIFACTS);
  } catch {
    // Sin almacenamiento (o dato corrupto): se empieza sin recientes.
  }
  return [];
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
  artifactToolsVisible: readArtifactToolsVisible(),
  setArtifactToolsVisible: (visible) => {
    try {
      localStorage.setItem(ARTIFACT_TOOLS_KEY, String(visible));
    } catch {
      // Sin almacenamiento la preferencia dura solo esta sesión.
    }
    set({ artifactToolsVisible: visible });
  },
  recentArtifacts: readRecentArtifacts(),
  rememberArtifact: (artifactType) =>
    set((state) => {
      const recentArtifacts = [artifactType, ...state.recentArtifacts.filter((type) => type !== artifactType)].slice(0, MAX_RECENT_ARTIFACTS);
      try {
        localStorage.setItem(RECENT_ARTIFACTS_KEY, JSON.stringify(recentArtifacts));
      } catch {
        // Sin almacenamiento los recientes duran solo esta sesión.
      }
      return { recentArtifacts };
    }),
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
