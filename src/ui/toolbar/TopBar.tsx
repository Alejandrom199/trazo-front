import { faRotateLeft, faRotateRight, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { usePersistenceStore, type SaveStatus } from '@/core/persistence/persistenceStore';
import { diagramRegistry } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';

/**
 * Barra del documento, sobre el lienzo: nombre del diagrama, tipo, estado del
 * guardado y deshacer/rehacer. Las acciones globales viven en el riel lateral.
 */
export function TopBar() {
  const diagram = useDiagramStore((state) => state.diagram);
  const renameDiagram = useDiagramStore((state) => state.renameDiagram);
  const canUndo = useDiagramStore((state) => state.past.length > 0);
  const canRedo = useDiagramStore((state) => state.future.length > 0);
  const undo = useDiagramStore((state) => state.undo);
  const redo = useDiagramStore((state) => state.redo);

  if (!diagram) return null;
  const moduleName = diagramRegistry.get(diagram.diagramType).displayName;

  return (
    <div className="flex h-11 items-center gap-3 rounded-lg border border-line bg-surface/85 px-2 shadow-panel backdrop-blur-md">
      <input
        value={diagram.name}
        onChange={(event) => renameDiagram(event.target.value)}
        aria-label="Nombre del diagrama"
        className="field-sizing-content min-w-24 max-w-md rounded-md px-2 py-1 text-sm font-semibold text-ink-900 outline-none hover:bg-raised focus:bg-raised focus:ring-2 focus:ring-accent/25"
      />
      <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">{moduleName}</span>
      <SaveIndicator />

      <div className="ml-auto flex items-center gap-0.5">
        <IconButton label="Deshacer (Ctrl+Z)" icon={faRotateLeft} disabled={!canUndo} onClick={undo} />
        <IconButton label="Rehacer (Ctrl+Y)" icon={faRotateRight} disabled={!canRedo} onClick={redo} />
      </div>
    </div>
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
    <span className={`text-xs ${className}`} title={title} role="status">
      {text}
    </span>
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
      className="flex size-8 items-center justify-center rounded-md text-ink-600 hover:bg-raised hover:text-ink-900 disabled:pointer-events-none disabled:opacity-35"
    >
      <FontAwesomeIcon icon={icon} className="text-[13px]" />
    </button>
  );
}
