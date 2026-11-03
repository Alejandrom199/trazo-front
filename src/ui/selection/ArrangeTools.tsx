import { alignNodes, distributeNodes, type Alignment, type DiagramNode, type DistributionAxis, type NodePlacement } from '@/core/model';
import type { DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';

/** Dibujo de cada botón: rectángulos que muestran el resultado y la línea de referencia. */
const ALIGNMENTS: { value: Alignment; label: string; icon: string }[] = [
  { value: 'left', label: 'Alinear a la izquierda', icon: 'M3 2v14 M5 4h9v3H5z M5 10h6v3H5z' },
  { value: 'centerX', label: 'Centrar en horizontal', icon: 'M9 2v14 M4 4h10v3H4z M6 10h6v3H6z' },
  { value: 'right', label: 'Alinear a la derecha', icon: 'M15 2v14 M4 4h9v3H4z M7 10h6v3H7z' },
  { value: 'top', label: 'Alinear arriba', icon: 'M2 3h14 M4 5h3v9H4z M10 5h3v6h-3z' },
  { value: 'centerY', label: 'Centrar en vertical', icon: 'M2 9h14 M4 4h3v10H4z M10 6h3v6h-3z' },
  { value: 'bottom', label: 'Alinear abajo', icon: 'M2 15h14 M4 4h3v9H4z M10 7h3v6h-3z' },
];
const DISTRIBUTIONS: { value: DistributionAxis; label: string; icon: string }[] = [
  { value: 'x', label: 'Repartir en horizontal', icon: 'M2 3v12 M16 3v12 M5 6h2v6H5z M11 6h2v6h-2z' },
  { value: 'y', label: 'Repartir en vertical', icon: 'M3 2h12 M3 16h12 M6 5h6v2H6z M6 11h6v2H6z' },
];

const isVertical = (alignment: Alignment) => alignment === 'top' || alignment === 'centerY' || alignment === 'bottom';

/**
 * Alinear y repartir los nodos seleccionados (un solo paso de deshacer). Los
 * participantes de una secuencia comparten fila, así que no se mueven en vertical.
 */
export function ArrangeTools({ nodes, module }: { nodes: DiagramNode[]; module: DiagramModule }) {
  const diagram = useDiagramStore((state) => state.diagram);
  if (!diagram || nodes.length < 2) return null;

  const ids = (vertical: boolean) =>
    nodes.filter((node) => !vertical || module.nodeKinds[node.artifactType]?.dragAxis !== 'x').map((node) => node.id);
  const apply = (placements: NodePlacement[]) =>
    useDiagramStore.getState().updateNodes(placements.map(({ id, position }) => ({ id, patch: { position } })));

  return (
    <section aria-label="Organizar" className="space-y-1.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Organizar</h3>
      <div className="flex flex-wrap gap-1">
        {ALIGNMENTS.map((option) => (
          <ToolButton key={option.value} label={option.label} icon={option.icon} onClick={() => apply(alignNodes(diagram, ids(isVertical(option.value)), option.value))} />
        ))}
        <span className="mx-0.5 w-px self-stretch bg-line" aria-hidden />
        {DISTRIBUTIONS.map((option) => (
          <ToolButton
            key={option.value}
            label={nodes.length < 3 ? `${option.label} (necesita 3 o más)` : option.label}
            icon={option.icon}
            disabled={nodes.length < 3}
            onClick={() => apply(distributeNodes(diagram, ids(option.value === 'y'), option.value))}
          />
        ))}
      </div>
    </section>
  );
}

function ToolButton({ label, icon, disabled = false, onClick }: { label: string; icon: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-md border border-line text-ink-600 hover:border-accent/50 hover:text-accent disabled:opacity-35"
    >
      <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden>
        <path d={icon} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </button>
  );
}
