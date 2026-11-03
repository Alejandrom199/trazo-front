import { faArrowPointer, faHand, faPencil, faShapes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect } from 'react';
import { useCanvasInteractionStore, type CanvasTool } from '@/canvas/canvasInteractionStore';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useUiStore } from '@/ui/uiStore';

const TOOLS: { id: CanvasTool; label: string; key: string; help: string; icon: typeof faArrowPointer }[] = [
  { id: 'hand', label: 'Mano', key: 'H', help: 'Mano (H): solo para moverte por el lienzo, sin seleccionar nada', icon: faHand },
  { id: 'pointer', label: 'Puntero', key: 'V', help: 'Puntero (V): clic para seleccionar, arrastra para mover; sobre el fondo, un recuadro selecciona. Alt + arrastrar desplaza el lienzo', icon: faArrowPointer },
  { id: 'lasso', label: 'Lápiz', key: 'L', help: 'Lápiz (L): dibuja a mano alzada el área que quieres seleccionar (Shift suma)', icon: faPencil },
];

/**
 * Herramientas del lienzo: mano, puntero y lápiz de selección (también con H, V y L),
 * y el botón que muestra u oculta los artefactos (también con A). Alt + arrastrar
 * desplaza el lienzo con cualquiera.
 */
export function CanvasSelectionToolbar() {
  const tool = useCanvasInteractionStore((state) => state.tool);
  const setTool = useCanvasInteractionStore((state) => state.setTool);
  const selected = useDiagramStore((state) => state.selection.nodeIds.length + state.selection.edgeIds.length);
  const artifactsVisible = useUiStore((state) => state.artifactToolsVisible);
  const setArtifactsVisible = useUiStore((state) => state.setArtifactToolsVisible);
  useToolShortcuts(setTool, toggleArtifacts);

  return (
    <div className="glass-panel relative flex h-11 items-center gap-1 rounded-xl p-1">
      {TOOLS.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={item.label}
          aria-pressed={tool === item.id}
          aria-keyshortcuts={item.key}
          title={item.help}
          onClick={() => setTool(item.id)}
          className={`flex size-9 items-center justify-center rounded-lg text-[13px] transition-colors ${
            tool === item.id ? 'bg-accent-soft text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'
          }`}
        >
          <FontAwesomeIcon icon={item.icon} />
        </button>
      ))}
      <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />
      <button
        type="button"
        aria-label="Artefactos"
        aria-pressed={artifactsVisible}
        aria-keyshortcuts="A"
        title={artifactsVisible ? 'Ocultar artefactos (A)' : 'Mostrar artefactos (A)'}
        onClick={() => setArtifactsVisible(!artifactsVisible)}
        className={`flex size-9 items-center justify-center rounded-lg text-[13px] transition-colors ${
          artifactsVisible ? 'bg-accent-soft text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'
        }`}
      >
        <FontAwesomeIcon icon={faShapes} />
      </button>
      {selected > 1 && (
        <span className="mx-1 border-l border-line pl-3 pr-2 text-xs text-ink-600" aria-live="polite">
          {selected} seleccionados
        </span>
      )}
    </div>
  );
}

function toggleArtifacts() {
  const { artifactToolsVisible, setArtifactToolsVisible } = useUiStore.getState();
  setArtifactToolsVisible(!artifactToolsVisible);
}

/** H, V y L cambian de herramienta y A muestra u oculta los artefactos, salvo mientras se escribe en un campo. */
function useToolShortcuts(setTool: (tool: CanvasTool) => void, toggleArtifacts: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key.toUpperCase() === 'A') return toggleArtifacts();
      const item = TOOLS.find((candidate) => candidate.key === event.key.toUpperCase());
      if (item) setTool(item.id);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setTool, toggleArtifacts]);
}
