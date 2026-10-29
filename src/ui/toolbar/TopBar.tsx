import { faBookOpen, faPlus, faRotateLeft, faRotateRight, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { usePersistenceStore, type SaveStatus } from '@/core/persistence/persistenceStore';
import { diagramRegistry } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { Panel } from '@/ui/layout/Panel';
import { useUiStore } from '@/ui/uiStore';
import { FileMenu } from './FileMenu';

export function TopBar() {
  const diagram = useDiagramStore((state) => state.diagram);
  const renameDiagram = useDiagramStore((state) => state.renameDiagram);
  const canUndo = useDiagramStore((state) => state.past.length > 0);
  const canRedo = useDiagramStore((state) => state.future.length > 0);
  const undo = useDiagramStore((state) => state.undo);
  const redo = useDiagramStore((state) => state.redo);

  const moduleName = diagram ? diagramRegistry.get(diagram.diagramType).displayName : null;

  return (
    <Panel className="flex h-12 items-center gap-3 px-3">
      <div className="flex items-center gap-2">
        <img src="/favicon.svg" alt="" className="size-6" />
        <span className="text-sm font-semibold tracking-tight">Trazo</span>
      </div>

      <NewDiagramButton />

      <span className="h-5 w-px bg-line" aria-hidden />

      {diagram && (
        <>
          <input
            value={diagram.name}
            onChange={(event) => renameDiagram(event.target.value)}
            aria-label="Nombre del diagrama"
            className="field-sizing-content min-w-24 max-w-md rounded-lg px-2 py-1 text-sm font-medium outline-none hover:bg-canvas focus:bg-canvas focus:ring-2 focus:ring-accent/20"
          />
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
            {moduleName}
          </span>
          <SaveIndicator />

          <div className="ml-auto flex items-center gap-1">
            <NarrateButton />
            <FileMenu />
            <LearningModeSwitch />
            <span className="mx-1 h-5 w-px bg-line" aria-hidden />
            <IconButton label="Deshacer (Ctrl+Z)" icon={faRotateLeft} disabled={!canUndo} onClick={undo} />
            <IconButton label="Rehacer (Ctrl+Y)" icon={faRotateRight} disabled={!canRedo} onClick={redo} />
          </div>
        </>
      )}
    </Panel>
  );
}

const SAVE_TEXT: Record<SaveStatus, { text: string; className: string; title: string }> = {
  idle: { text: '', className: '', title: '' },
  saving: { text: 'Guardando…', className: 'text-ink-400', title: 'Guardando en este navegador' },
  saved: { text: 'Guardado', className: 'text-ink-400', title: 'Guardado en este navegador' },
  error: { text: 'No se pudo guardar', className: 'text-rose-600', title: 'El almacenamiento del navegador está lleno o bloqueado. Exporta como JSON.' },
  unavailable: { text: 'Sin guardado', className: 'text-amber-600', title: 'Este navegador no permite guardar. Exporta como JSON.' },
};

function SaveIndicator() {
  const status = usePersistenceStore((state) => state.status);
  const { text, className, title } = SAVE_TEXT[status];
  if (!text) return null;
  return (
    <span className={`text-xs ${className}`} title={title} role="status">
      {text}
    </span>
  );
}

function NewDiagramButton() {
  const setGalleryOpen = useUiStore((state) => state.setGalleryOpen);
  return (
    <button
      type="button"
      onClick={() => setGalleryOpen(true)}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-600 hover:bg-canvas hover:text-ink-900"
    >
      <FontAwesomeIcon icon={faPlus} className="text-[11px]" />
      Abrir / Nuevo
    </button>
  );
}

function NarrateButton() {
  const narrationOpen = useUiStore((state) => state.narrationOpen);
  const setNarrationOpen = useUiStore((state) => state.setNarrationOpen);
  return (
    <button
      type="button"
      onClick={() => setNarrationOpen(!narrationOpen)}
      aria-pressed={narrationOpen}
      className={`mr-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
        narrationOpen ? 'bg-accent text-white' : 'bg-accent-soft text-accent hover:bg-accent/15'
      }`}
    >
      <FontAwesomeIcon icon={faBookOpen} className="text-[11px]" />
      Explicar diagrama
    </button>
  );
}

/** Interruptor del modo aprendizaje: explicaciones automáticas al seleccionar. */
function LearningModeSwitch() {
  const learningMode = useUiStore((state) => state.learningMode);
  const setLearningMode = useUiStore((state) => state.setLearningMode);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={learningMode}
      onClick={() => setLearningMode(!learningMode)}
      title="Muestra la explicación de cada elemento automáticamente al seleccionarlo"
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-600 hover:bg-canvas"
    >
      Modo aprendizaje
      {/* Riel de 28px; perilla de 12px a 2px del borde: recorre 12px (2 + 12 + 12 + 2 = 28). */}
      <span
        className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${learningMode ? 'bg-accent' : 'bg-ink-400/40'}`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 left-0.5 size-3 rounded-full bg-surface shadow-sm transition-transform ${learningMode ? 'translate-x-3' : 'translate-x-0'}`}
        />
      </span>
    </button>
  );
}

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
      className="flex size-8 items-center justify-center rounded-lg text-ink-600 hover:bg-canvas disabled:pointer-events-none disabled:opacity-35"
    >
      <FontAwesomeIcon icon={icon} className="text-[13px]" />
    </button>
  );
}
