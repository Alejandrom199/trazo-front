import { create } from 'zustand';

const THEME_KEY = 'trazo.theme';
const RECENT_ARTIFACTS_KEY = 'trazo.recentArtifacts';
const ARTIFACT_TOOLS_KEY = 'trazo.artifactToolsVisible';
const PROJECT_SIDEBAR_KEY = 'trazo.projectSidebarOpen';
const TUTORIAL_KEY = 'trazo.tutorial';
/** Cuántos artefactos usados recientemente se recuerdan. */
const MAX_RECENT_ARTIFACTS = 4;

export type Theme = 'light' | 'dark';
export type InspectorTab = 'properties' | 'explanation' | 'problems' | 'narration' | 'traceability';

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
  /** Gestor del proyecto activo y sus diagramas. */
  projectOpen: boolean;
  setProjectOpen: (open: boolean) => void;
  /** Navegador lateral del proyecto activo. */
  projectSidebarOpen: boolean;
  setProjectSidebarOpen: (open: boolean) => void;
  /** Inspector estable del editor: una sola superficie para selección, teoría, validación y narración. */
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;
  inspectorTab: InspectorTab;
  setInspectorTab: (tab: InspectorTab) => void;
  /** Tira de herramientas de artefactos sobre el lienzo: visible hasta que el usuario la oculte (botón o tecla A). */
  artifactToolsVisible: boolean;
  setArtifactToolsVisible: (visible: boolean) => void;
  /** Últimos artefactos agregados (más reciente primero); el menú del lienzo los ofrece primero. */
  recentArtifacts: string[];
  rememberArtifact: (artifactType: string) => void;
  /** Pestaña del popup del lienzo; se recuerda para el siguiente elemento que se clique. */
  popoverTab: PopoverTab;
  setPopoverTab: (tab: PopoverTab) => void;
  /** Aviso breve para el usuario (p. ej. un archivo que no se pudo importar). */
  notice: string | null;
  showNotice: (message: string) => void;
  /** Artefacto abierto desde la vista rápida, cuando el lienzo no tiene selección. */
  pinnedExplanation: string | null;
  setPinnedExplanation: (artifactType: string | null) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  tutorialStatus: TutorialStatus;
  tutorialStep: number;
  /** Paso en el que ocurrió la última exportación, para completar el recorrido. */
  tutorialExportOnStep: number | null;
  startTutorial: () => void;
  skipTutorial: () => void;
  restartTutorial: () => void;
  setTutorialStep: (step: number) => void;
  finishTutorial: () => void;
  noteExport: () => void;
}

export type TutorialStatus = 'offer' | 'active' | 'dismissed' | 'done';

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

function readProjectSidebarOpen(): boolean {
  try {
    const saved = localStorage.getItem(PROJECT_SIDEBAR_KEY);
    if (saved === 'true' || saved === 'false') return saved === 'true';
  } catch {
    // Se usa el ancho disponible.
  }
  return typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches;
}

function readTutorial(): TutorialStatus {
  try {
    const saved = localStorage.getItem(TUTORIAL_KEY);
    if (saved === 'dismissed' || saved === 'done') return saved;
  } catch {
    // Sin almacenamiento, se ofrece el recorrido en esta sesión.
  }
  return 'offer';
}

function rememberTutorial(status: TutorialStatus): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, status);
  } catch {
    // La decisión dura solo esta sesión.
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
  projectOpen: false,
  setProjectOpen: (open) => set({ projectOpen: open }),
  projectSidebarOpen: readProjectSidebarOpen(),
  setProjectSidebarOpen: (open) => {
    try {
      localStorage.setItem(PROJECT_SIDEBAR_KEY, String(open));
    } catch {
      // Sin almacenamiento la preferencia dura solo esta sesión.
    }
    set({ projectSidebarOpen: open });
  },
  inspectorOpen: typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches,
  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  inspectorTab: 'properties',
  setInspectorTab: (tab) => set({ inspectorTab: tab, inspectorOpen: true }),
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
  popoverTab: 'properties',
  setPopoverTab: (tab) => set({ popoverTab: tab }),
  notice: null,
  showNotice: (message) => {
    clearTimeout(noticeTimer);
    set({ notice: message });
    noticeTimer = setTimeout(() => set({ notice: null }), NOTICE_DURATION_MS);
  },
  pinnedExplanation: null,
  setPinnedExplanation: (artifactType) => set({ pinnedExplanation: artifactType }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  tutorialStatus: readTutorial(),
  tutorialStep: 0,
  tutorialExportOnStep: null,
  startTutorial: () => {
    rememberTutorial('active');
    set({ tutorialStatus: 'active', tutorialStep: 0, tutorialExportOnStep: null, galleryOpen: false });
  },
  skipTutorial: () => {
    rememberTutorial('dismissed');
    set({ tutorialStatus: 'dismissed' });
  },
  restartTutorial: () => {
    rememberTutorial('active');
    set({ tutorialStatus: 'active', tutorialStep: 0, tutorialExportOnStep: null });
  },
  setTutorialStep: (step) => set({ tutorialStep: step }),
  finishTutorial: () => {
    rememberTutorial('done');
    set({ tutorialStatus: 'done' });
  },
  noteExport: () => set((state) => ({ tutorialExportOnStep: state.tutorialStatus === 'active' ? state.tutorialStep : state.tutorialExportOnStep })),
}));
