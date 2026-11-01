import { faLock } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react';
import { useDiagramStore } from '@/core/store/diagramStore';
import type { ArtifactFlowNode } from './adapters';
import { EditableText } from './EditableText';
import { useActiveModule } from './useActiveModule';

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

/** Lado mínimo al redimensionar: permite barras finas (fork/join) sin colapsar nodos. */
const MAX_MIN_SIDE = 40;

/**
 * Envoltorio común de todos los nodos: pone los puntos de conexión, el control
 * de tamaño y la edición de la etiqueta, y delega el dibujo al componente del módulo.
 */
export function ArtifactNodeView({ id, data, selected }: NodeProps<ArtifactFlowNode>) {
  const module = useActiveModule();
  const isEditing = useDiagramStore((state) => state.editingNodeId === id);
  const startEditing = useDiagramStore((state) => state.startEditing);
  const setNodeLabel = useDiagramStore((state) => state.setNodeLabel);
  const checkpoint = useDiagramStore((state) => state.checkpoint);

  const { node } = data;
  const kind = module?.nodeKinds[node.artifactType];
  if (!kind) return null;

  const Shape = kind.component;
  const minSide = Math.min(kind.defaultSize.width, kind.defaultSize.height, MAX_MIN_SIDE);

  const label = !kind.hasLabel ? null : isEditing ? (
    <EditableText
      initialValue={node.label}
      multiline
      className="w-full"
      onCommit={(value) => {
        setNodeLabel(id, value);
        startEditing(null);
      }}
      onCancel={() => startEditing(null)}
    />
  ) : (
    <span className="whitespace-pre-wrap break-words">{node.label}</span>
  );

  return (
    <>
      {kind.resizable && !node.locked && (
        <NodeResizer
          isVisible={selected && !isEditing}
          minWidth={minSide}
          minHeight={minSide}
          onResizeStart={checkpoint}
          lineClassName="!border-accent/40"
          handleClassName="!size-2 !rounded-full !border-accent !bg-surface"
        />
      )}
      <div className="size-full" onDoubleClick={kind.hasLabel ? () => startEditing(id) : undefined}>
        <Shape node={node} selected={selected} label={label} joinedSides={data.joinedSides} />
      </div>
      {node.locked && (
        <span
          title="Bloqueado: no se puede mover ni borrar"
          className="pointer-events-auto absolute -top-2 -right-2 flex size-[18px] items-center justify-center rounded-full border border-line bg-surface text-[9px] text-ink-600 shadow-sm"
        >
          <FontAwesomeIcon icon={faLock} />
        </span>
      )}
      {kind.connectable &&
        SIDES.map((side) => <Handle key={side} id={side} type="source" position={side} className="trazo-handle" />)}
    </>
  );
}
