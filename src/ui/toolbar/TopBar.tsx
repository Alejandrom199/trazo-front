import type { ReactNode } from 'react';
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
            <IconButton label="Deshacer (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
            </IconButton>
            <IconButton label="Rehacer (Ctrl+Y)" disabled={!canRedo} onClick={redo}>
              <path d="m15 14 5-5-5-5" />
              <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
            </IconButton>
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
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
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
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      </svg>
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
      <span
        className={`relative h-4 w-7 rounded-full transition-colors ${learningMode ? 'bg-accent' : 'bg-ink-400/40'}`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 size-3 rounded-full bg-surface shadow-sm transition-transform ${learningMode ? 'translate-x-3.5' : 'translate-x-0.5'}`}
        />
      </span>
    </button>
  );
}

interface IconButtonProps {
  label: string;
  disabled: boolean;
  onClick: () => void;
  /** Trazos SVG del icono (24×24). */
  children: ReactNode;
}

function IconButton({ label, disabled, onClick, children }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg text-ink-600 hover:bg-canvas disabled:pointer-events-none disabled:opacity-35"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
