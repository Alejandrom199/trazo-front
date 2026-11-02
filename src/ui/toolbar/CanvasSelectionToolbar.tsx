import { faArrowPointer, faObjectGroup } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCanvasInteractionStore, type CanvasTool } from '@/canvas/canvasInteractionStore';
import { useDiagramStore } from '@/core/store/diagramStore';

const TOOLS: { id: CanvasTool; label: string; help: string; icon: typeof faArrowPointer }[] = [
  { id: 'move', label: 'Mover', help: 'Mover el lienzo y seleccionar con clic', icon: faArrowPointer },
  { id: 'marquee', label: 'Seleccionar área', help: 'Arrastrar un marco para seleccionar varios elementos', icon: faObjectGroup },
];

export function CanvasSelectionToolbar() {
  const tool = useCanvasInteractionStore((state) => state.tool);
  const setTool = useCanvasInteractionStore((state) => state.setTool);
  const selected = useDiagramStore((state) => state.selection.nodeIds.length + state.selection.edgeIds.length);

  return (
    <div className="flex h-11 items-center gap-1 rounded-xl border border-line bg-surface/95 p-1 shadow-panel backdrop-blur">
      {TOOLS.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={item.label}
          aria-pressed={tool === item.id}
          title={item.help}
          onClick={() => setTool(item.id)}
          className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors ${
            tool === item.id ? 'bg-accent-soft text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'
          }`}
        >
          <FontAwesomeIcon icon={item.icon} className="text-[12px]" />
          <span className="hidden sm:inline">{item.label}</span>
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
