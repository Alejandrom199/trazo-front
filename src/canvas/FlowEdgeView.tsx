import { BaseEdge, EdgeLabelRenderer, useInternalNode, useReactFlow, type EdgeProps, type InternalNode } from '@xyflow/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Position } from '@/core/model';
import { useDiagramStore } from '@/core/store/diagramStore';
import type { FlowEdge } from './adapters';
import { EditableText } from './EditableText';
import type { Rect } from './edgeGeometry';
import { buildEdgePath } from './edgePath';
import { useGridStore } from './gridStore';
import { useActiveModule } from './useActiveModule';

function rectOf(node: InternalNode): Rect {
  return {
    ...node.internals.positionAbsolute,
    width: node.measured.width ?? node.width ?? 0,
    height: node.measured.height ?? node.height ?? 0,
  };
}

/**
 * Conexión entre dos nodos, con su trazado (ortogonal, recta o curva) y sus
 * vértices. Muestra la guarda como [condición]. Seleccionada, muestra los
 * tiradores para editar el recorrido:
 *   ● vértice: se arrastra para moverlo; doble clic lo quita.
 *   ○ punto sobre cada tramo: se arrastra (o se pulsa) para crear un vértice nuevo.
 */
export function FlowEdgeView({ id, source, target, data, style, markerEnd, selected }: EdgeProps<FlowEdge>) {
  const module = useActiveModule();
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const isEditing = useDiagramStore((state) => state.editingEdgeId === id);
  const setEdgeGuard = useDiagramStore((state) => state.setEdgeGuard);
  const startEditingEdge = useDiagramStore((state) => state.startEditingEdge);
  const startDrag = useWaypointDrag(id);

  if (!sourceNode || !targetNode || !data) return null;

  const { edge } = data;
  const path = buildEdgePath(rectOf(sourceNode), rectOf(targetNode), edge.routing, edge.waypoints);

  const hasGuard = module?.edgeKinds[edge.artifactType]?.text === 'guard';
  const showLabel = hasGuard && (isEditing || edge.guard);

  // Un punto sobre la línea por cada tramo: ahí nace un vértice nuevo.
  const insertionPoints = path.insertionPoints.map((point, index) => ({ ...point, insertAt: index }));

  return (
    <>
      <BaseEdge id={id} path={path.d} style={style} markerEnd={markerEnd} interactionWidth={16} />
      <EdgeLabelRenderer>
        {showLabel && (
          <div
            className="nodrag nopan pointer-events-auto absolute rounded-md bg-canvas px-1.5 py-0.5 text-xs text-ink-600"
            // zIndex: las flechas entre nodos de un carril se elevan sobre él; la guarda debe quedar encima de ellas.
            style={{ transform: `translate(-50%, -50%) translate(${path.label.x}px, ${path.label.y}px)`, zIndex: 1000 }}
            onDoubleClick={() => startEditingEdge(id)}
          >
            {isEditing ? (
              <span className="flex items-center">
                [
                <EditableText
                  initialValue={edge.guard ?? ''}
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
              `[${edge.guard}]`
            )}
          </div>
        )}

        {selected &&
          insertionPoints.map((point) => (
            <Handle
              key={`insert-${point.insertAt}`}
              point={point}
              kind="insert"
              title="Arrastra para crear un vértice"
              onPointerDown={(event) => startDrag(event, edge.waypoints, point.insertAt, point)}
            />
          ))}
        {selected &&
          edge.waypoints.map((point, index) => (
            <Handle
              key={`vertex-${index}`}
              point={point}
              kind="vertex"
              title="Arrastra para mover el vértice. Doble clic para quitarlo"
              onPointerDown={(event) => startDrag(event, edge.waypoints, index)}
              onDoubleClick={() =>
                useDiagramStore.getState().updateEdge(id, { waypoints: edge.waypoints.filter((_, i) => i !== index) })
              }
            />
          ))}
      </EdgeLabelRenderer>
    </>
  );
}

interface HandleProps {
  point: Position;
  kind: 'vertex' | 'insert';
  title: string;
  onPointerDown: (event: ReactPointerEvent) => void;
  onDoubleClick?: () => void;
}

/** Tirador de edición del recorrido, en coordenadas del lienzo. */
function Handle({ point, kind, title, onPointerDown, onDoubleClick }: HandleProps) {
  const size = kind === 'vertex' ? 11 : 9;
  return (
    <div
      title={title}
      onPointerDown={onPointerDown}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDoubleClick?.();
      }}
      className={`nodrag nopan pointer-events-auto absolute cursor-move rounded-full border-[1.5px] border-accent transition-transform hover:scale-125 ${
        kind === 'vertex' ? 'bg-accent' : 'bg-surface opacity-80 hover:opacity-100'
      }`}
      style={{
        width: size,
        height: size,
        transform: `translate(-50%, -50%) translate(${point.x}px, ${point.y}px)`,
        zIndex: 1001,
      }}
    />
  );
}

/**
 * Arrastre de un vértice. Al empezar se guarda un checkpoint (todo el gesto se
 * deshace de una vez); con `inserting`, primero se crea el vértice nuevo en esa
 * posición. Con la cuadrícula visible, el vértice se ajusta a sus celdas.
 */
function useWaypointDrag(edgeId: string) {
  const { screenToFlowPosition } = useReactFlow();
  const grid = useGridStore();

  return (event: ReactPointerEvent, waypoints: Position[], index: number, inserting?: Position) => {
    event.stopPropagation();
    event.preventDefault();
    const store = useDiagramStore.getState();
    store.checkpoint();

    const step = grid.visible ? grid.size : 1;
    const snap = (point: Position) => ({ x: Math.round(point.x / step) * step, y: Math.round(point.y / step) * step });
    let points = inserting
      ? [...waypoints.slice(0, index), snap(inserting), ...waypoints.slice(index)]
      : [...waypoints];
    if (inserting) store.setEdgeWaypoints(edgeId, points);

    const move = (moveEvent: PointerEvent) => {
      const position = snap(screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY }));
      points = points.map((point, i) => (i === index ? position : point));
      useDiagramStore.getState().setEdgeWaypoints(edgeId, points);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };
}
