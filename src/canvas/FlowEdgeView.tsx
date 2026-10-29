import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useInternalNode, type EdgeProps, type InternalNode } from '@xyflow/react';
import { useDiagramStore } from '@/core/store/diagramStore';
import type { FlowEdge } from './adapters';
import { EditableText } from './EditableText';
import { floatingEndpoints, type Rect } from './edgeGeometry';
import { useActiveModule } from './useActiveModule';

function rectOf(node: InternalNode): Rect {
  return {
    ...node.internals.positionAbsolute,
    width: node.measured.width ?? node.width ?? 0,
    height: node.measured.height ?? node.height ?? 0,
  };
}

/**
 * Conexión ortogonal (con ángulos rectos y esquinas suaves) que elige sola
 * los lados de salida y llegada. Muestra la guarda como [condición].
 */
export function FlowEdgeView({ id, source, target, data, style, markerEnd }: EdgeProps<FlowEdge>) {
  const module = useActiveModule();
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const isEditing = useDiagramStore((state) => state.editingEdgeId === id);
  const setEdgeGuard = useDiagramStore((state) => state.setEdgeGuard);
  const startEditingEdge = useDiagramStore((state) => state.startEditingEdge);

  if (!sourceNode || !targetNode || !data) return null;

  const [path, labelX, labelY] = getSmoothStepPath({
    ...floatingEndpoints(rectOf(sourceNode), rectOf(targetNode)),
    borderRadius: 10,
    offset: 18,
  });

  const { guard } = data.edge;
  const hasGuard = module?.edgeKinds[data.edge.artifactType]?.hasGuard ?? false;
  const showLabel = hasGuard && (isEditing || guard);

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} interactionWidth={16} />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute rounded-md bg-canvas px-1.5 py-0.5 text-xs text-ink-600"
            // zIndex: las flechas entre nodos de un carril se elevan sobre él; la guarda debe quedar encima de ellas.
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, zIndex: 1000 }}
            onDoubleClick={() => startEditingEdge(id)}
          >
            {isEditing ? (
              <span className="flex items-center">
                [
                <EditableText
                  initialValue={guard ?? ''}
                  multiline={false}
                  placeholder="condición"
                  className="min-w-16"
                  onCommit={(value) => {
                    setEdgeGuard(id, value === '' ? null : value);
                    startEditingEdge(null);
                  }}
                  onCancel={() => startEditingEdge(null)}
                />
                ]
              </span>
            ) : (
              `[${guard}]`
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
