import { faFolderOpen, faGraduationCap, faMagnifyingGlass, faMoon, faPenRuler, faRotateLeft, faRotateRight, faSun, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { usePersistenceStore, type SaveStatus } from '@/core/persistence/persistenceStore';
import { diagramRegistry } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';
import { Logo } from '@/ui/brand/Logo';
import { navigate, useRoute } from '@/ui/navigation/route';
import { FileMenu } from '@/ui/toolbar/FileMenu';
import { useUiStore } from '@/ui/uiStore';

/**
 * Barra superior de toda la app, en una sola fila (el lienzo queda con todo el ancho):
 *   izquierda: logo, menú Archivo y el documento (nombre, tipo, guardado);
 *   derecha: deshacer, la sección (Editor / Aprender) y el tema.
 *   Vista, zoom y cuadrícula viven en la barra inferior del lienzo.
 */
export function AppHeader() {
  const route = useRoute();
  const inEditor = route.page === 'editor';

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 sm:gap-3 sm:px-3">
      <div className="size-8 shrink-0 overflow-hidden rounded-lg" title="Trazo Diagram">
        <Logo size={32} />
      </div>
      {inEditor && <FileMenu />}
      {inEditor && <ProjectBadge />}
      {inEditor && <DocumentTitle />}
      {!inEditor && <span className="hidden text-sm font-semibold text-ink-900 sm:inline">Trazo Diagram</span>}

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        {inEditor && (
          <>
            <UndoRedo />
            <Divider />
          </>
        )}
        <button type="button" onClick={() => useUiStore.getState().setCommandPaletteOpen(true)} aria-label="Buscar" aria-keyshortcuts="Control+K" className="flex size-11 items-center justify-center rounded-md text-ink-600 hover:bg-raised hover:text-ink-900 sm:hidden">
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        </button>
        <button type="button" onClick={() => useUiStore.getState().setCommandPaletteOpen(true)} className="hidden h-11 items-center rounded-md px-2 text-xs text-ink-400 hover:bg-raised hover:text-ink-900 sm:flex" aria-keyshortcuts="Control+K">
          Buscar
          <kbd className="ml-2 rounded border border-line px-1 text-[10px]">Ctrl K</kbd>
        </button>
        <SectionSwitch inEditor={inEditor} />
        <ThemeToggle />
      </div>
    </header>
  );
}

function ProjectBadge() {
  const project = useProjectStore((state) => state.project);
  const sidebarOpen = useUiStore((state) => state.projectSidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setProjectSidebarOpen);
  if (!project) return null;
  return (
    <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} aria-pressed={sidebarOpen} title={sidebarOpen ? 'Ocultar navegador del proyecto' : 'Mostrar navegador del proyecto'} className="hidden max-w-48 items-center gap-1.5 rounded-md bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/15 md:flex">
      <FontAwesomeIcon icon={faFolderOpen} className="text-[11px]" />
      <span className="truncate">{project.name}</span>
      <span className="rounded-full bg-surface px-1.5 text-[10px]">{project.diagramIds.length}</span>
    </button>
  );
}

function DocumentTitle() {
  const diagram = useDiagramStore((state) => state.diagram);
  const renameDiagram = useDiagramStore((state) => state.renameDiagram);
  if (!diagram) return null;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <input
        value={diagram.name}
        onChange={(event) => renameDiagram(event.target.value)}
        aria-label="Nombre del diagrama"
        className="field-sizing-content max-w-full min-w-12 rounded-md px-2 py-1 text-sm font-semibold text-ink-900 outline-none hover:bg-raised focus:bg-raised focus:ring-2 focus:ring-accent/25 md:max-w-xs"
      />
      <span className="hidden rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-accent xl:inline">
        {diagramRegistry.get(diagram.diagramType).displayName}
      </span>
      <span className="hidden lg:inline">
        <SaveIndicator />
      </span>
    </div>
  );
}

function UndoRedo() {
  const canUndo = useDiagramStore((state) => state.past.length > 0);
  const canRedo = useDiagramStore((state) => state.future.length > 0);
  const undo = useDiagramStore((state) => state.undo);
  const redo = useDiagramStore((state) => state.redo);
  return (
    <>
      <IconButton label="Deshacer (Ctrl+Z)" icon={faRotateLeft} disabled={!canUndo} onClick={undo} />
      <IconButton label="Rehacer (Ctrl+Y)" icon={faRotateRight} disabled={!canRedo} onClick={redo} />
    </>
  );
}

/** Editor o Aprender: las dos secciones de la app, como pestañas (en móvil, un solo botón que cambia). */
function SectionSwitch({ inEditor }: { inEditor: boolean }) {
  const option = (active: boolean, label: string, onClick: () => void) => (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${active ? 'bg-surface text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900'}`}
    >
      {label}
    </button>
  );
  return (
    <>
      <div role="tablist" aria-label="Sección" className="mx-1 hidden rounded-lg bg-canvas p-0.5 sm:flex">
        {option(inEditor, 'Editor', () => navigate({ page: 'editor' }))}
        {option(!inEditor, 'Aprender', () => navigate({ page: 'learn' }))}
      </div>
      <span className="sm:hidden">
        <IconButton
          label={inEditor ? 'Ir a Aprender' : 'Volver al editor'}
          icon={inEditor ? faGraduationCap : faPenRuler}
          disabled={false}
          onClick={() => navigate(inEditor ? { page: 'learn' } : { page: 'editor' })}
        />
      </span>
    </>
  );
}

function ThemeToggle() {
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const isDark = theme === 'dark';
  return (
    <IconButton
      label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      icon={isDark ? faSun : faMoon}
      disabled={false}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    />
  );
}

const SAVE_TEXT: Record<SaveStatus, { text: string; className: string; title: string }> = {
  idle: { text: '', className: '', title: '' },
  saving: { text: 'Guardando…', className: 'text-ink-400', title: 'Guardando en este navegador' },
  saved: { text: 'Guardado', className: 'text-ink-400', title: 'Guardado en este navegador' },
  error: { text: 'No se pudo guardar', className: 'text-danger', title: 'El almacenamiento del navegador está lleno o bloqueado. Exporta como JSON.' },
  unavailable: { text: 'Sin guardado', className: 'text-warning', title: 'Este navegador no permite guardar. Exporta como JSON.' },
};

function SaveIndicator() {
  const status = usePersistenceStore((state) => state.status);
  const { text, className, title } = SAVE_TEXT[status];
  if (!text) return null;
  return (
    <span className={`text-xs whitespace-nowrap ${className}`} title={title} role="status">
      {text}
    </span>
  );
}

const Divider = () => <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden />;

interface IconButtonProps {
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon: IconDefinition;
}

function IconButton({ label, icon, disabled, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-md text-ink-600 hover:bg-raised hover:text-ink-900 disabled:pointer-events-none disabled:opacity-35"
    >
      <FontAwesomeIcon icon={icon} className="text-[13px]" />
    </button>
  );
}
