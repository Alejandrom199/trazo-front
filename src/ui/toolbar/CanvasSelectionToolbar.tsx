import { faArrowPointer, faPencil } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect } from 'react';
import { useCanvasInteractionStore, type CanvasTool } from '@/canvas/canvasInteractionStore';
import { useDiagramStore } from '@/core/store/diagramStore';

const TOOLS: { id: CanvasTool; label: string; key: string; help: string; icon: typeof faArrowPointer }[] = [
  { id: 'pointer', label: 'Puntero', key: 'V', help: 'Puntero (V): clic para seleccionar, arrastra para mover; sobre el fondo, un recuadro selecciona. Ctrl + arrastrar desplaza el lienzo', icon: faArrowPointer },
  { id: 'lasso', label: 'Lápiz', key: 'L', help: 'Lápiz (L): dibuja a mano alzada el área que quieres seleccionar (Shift suma)', icon: faPencil },
];

/** Herramientas del lienzo: puntero y lápiz de selección (también con V y L). Ctrl + arrastrar desplaza el lienzo. */
export function CanvasSelectionToolbar() {
  const tool = useCanvasInteractionStore((state) => state.tool);
  const setTool = useCanvasInteractionStore((state) => state.setTool);
  const selected = useDiagramStore((state) => state.selection.nodeIds.length + state.selection.edgeIds.length);
  useToolShortcuts(setTool);

  return (
    <div className="flex h-11 items-center gap-1 rounded-xl border border-line bg-surface/95 p-1 shadow-panel backdrop-blur">
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
      {selected > 1 && (
        <span className="mx-1 border-l border-line pl-3 pr-2 text-xs text-ink-600" aria-live="polite">
          {selected} seleccionados
        </span>
      )}
    </div>
  );
}

/** V y L cambian de herramienta, salvo mientras se escribe en un campo. */
function useToolShortcuts(setTool: (tool: CanvasTool) => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const item = TOOLS.find((candidate) => candidate.key === event.key.toUpperCase());
      if (item) setTool(item.id);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setTool]);
}
