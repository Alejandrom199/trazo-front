import { BaseEdge, EdgeLabelRenderer, useInternalNode, useReactFlow, type EdgeProps, type InternalNode } from '@xyflow/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { absolutePosition, EDGE_OFFSET_KEY, LABEL_OFFSET_KEY, readLabelOffset, type DiagramEdge, type Position } from '@/core/model';
import type { EdgeTextKind } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import type { FlowEdge } from './adapters';
import { connectionPath } from './connectionPath';
import { EditableText } from './EditableText';
import type { Rect } from './edgeGeometry';
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
 * Conexión entre dos nodos, con el recorrido que declara su tipo y su texto
 * (guarda [condición] o etiqueta libre). Seleccionada, muestra los tiradores:
 *   - recorrido libre: ● vértice (se arrastra; doble clic lo quita) y ○ punto
 *     sobre cada tramo (se arrastra o se pulsa para crear un vértice).
 *   - horizontal (mensaje): un tirador en su origen que la sube o la baja.
 */
export function FlowEdgeView({ id, source, target, data, style, markerEnd, selected }: EdgeProps<FlowEdge>) {
  const module = useActiveModule();
  const diagram = useDiagramStore((state) => state.diagram);
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const isEditing = useDiagramStore((state) => state.editingEdgeId === id);
  const startDrag = useWaypointDrag(id);
  const startHeightDrag = useHeightDrag(id);
  const startLabelDrag = useLabelDrag();

  if (!sourceNode || !targetNode || !data || !module || !diagram) return null;

  const { edge } = data;
  const kind = module.edgeKinds[edge.artifactType];
  const path = connectionPath(diagram, module, edge, rectOf(sourceNode), rectOf(targetNode));
  const isHorizontal = kind?.layout === 'horizontal';
  const labelOffset = readLabelOffset(edge);

  // Un punto sobre la línea por cada tramo: ahí nace un vértice nuevo.
  const insertionPoints = path.insertionPoints.map((point, index) => ({ ...point, insertAt: index }));

  return (
    <>
      <BaseEdge id={id} path={path.d} style={style} markerEnd={markerEnd} interactionWidth={16} />
      <EdgeLabelRenderer>
        {kind?.text && (
          <EdgeText
            edge={edge}
            textKind={kind.text}
            at={{ x: path.label.x + labelOffset.x, y: path.label.y + labelOffset.y }}
            above={isHorizontal}
            isEditing={isEditing}
            onDragStart={(event) => startLabelDrag(event, edge)}
          />
        )}

        {selected && isHorizontal && (
          <Handle
            point={path.controlPoints[0]!}
            kind="height"
            title="Arrastra para subir o bajar el mensaje"
            onPointerDown={(event) => startHeightDrag(event, edge)}
          />
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
          !isHorizontal &&
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

interface EdgeTextProps {
  edge: DiagramEdge;
  textKind: EdgeTextKind;
  at: Position;
  /** Encima de la línea (mensajes) en vez de centrado sobre ella. */
  above: boolean;
  isEditing: boolean;
  /** Empieza a arrastrar el texto a otra posición. */
  onDragStart: (event: ReactPointerEvent) => void;
}

const store = () => useDiagramStore.getState();

/** Texto de la conexión: la guarda entre corchetes o la etiqueta tal cual. Doble clic para escribirlo. */
function EdgeText({ edge, textKind, at, above, isEditing, onDragStart }: EdgeTextProps) {
  const isGuard = textKind === 'guard';
  const value = isGuard ? (edge.guard ?? '') : edge.label;
  if (!isEditing && !value) return null;

  const commit = (text: string) => {
    if (isGuard) store().setEdgeGuard(edge.id, text === '' ? null : text);
    else store().updateEdge(edge.id, { label: text });
    store().startEditingEdge(null);
  };

  return (
    <div
      title={isEditing ? undefined : 'Arrastra para mover el texto. Doble clic para editarlo'}
      onPointerDown={isEditing ? undefined : onDragStart}
      className={`trazo-edge-label nodrag nopan pointer-events-auto absolute rounded-md px-1.5 py-0.5 text-xs whitespace-nowrap ${
        isEditing ? '' : 'cursor-move '
      }${
        above ? 'text-ink-900' : 'bg-canvas text-ink-600'
      }`}
      // zIndex: las flechas entre nodos de un carril se elevan sobre él; el texto debe quedar encima de ellas.
      style={{
        transform: `translate(-50%, ${above ? '-100%' : '-50%'}) translate(${at.x}px, ${at.y - (above ? 2 : 0)}px)`,
        zIndex: 1000,
      }}
      onDoubleClick={() => store().startEditingEdge(edge.id)}
    >
      {isEditing ? (
        <span className="flex items-center">
          {isGuard && '['}
          <EditableText
            initialValue={value}
            multiline={false}
            placeholder={isGuard ? 'condición' : 'mensaje'}
            className="min-w-16"
            onCommit={commit}
            onCancel={() => store().startEditingEdge(null)}
          />
          {isGuard && ']'}
        </span>
      ) : isGuard ? (
        `[${value}]`
      ) : (
        value
      )}
    </div>
  );
}

interface HandleProps {
  point: Position;
  kind: 'vertex' | 'insert' | 'height';
  title: string;
  onPointerDown: (event: ReactPointerEvent) => void;
  onDoubleClick?: () => void;
}

/** Tirador de edición del recorrido, en coordenadas del lienzo. */
function Handle({ point, kind, title, onPointerDown, onDoubleClick }: HandleProps) {
  const size = kind === 'insert' ? 9 : 11;
  return (
    <div
      title={title}
      onPointerDown={onPointerDown}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDoubleClick?.();
      }}
      className={`nodrag nopan pointer-events-auto absolute rounded-full border-[1.5px] border-accent transition-transform hover:scale-125 ${
        kind === 'height' ? 'cursor-ns-resize' : 'cursor-move'
      } ${kind === 'insert' ? 'bg-surface opacity-80 hover:opacity-100' : 'bg-accent'}`}
      style={{
        width: size,
        height: size,
        transform: `translate(-50%, -50%) translate(${point.x}px, ${point.y}px)`,
        zIndex: 1001,
      }}
    />
  );
}

/** Ajuste a la cuadrícula: al tamaño de la celda si se ve; si no, píxel a píxel. */
function useSnap() {
  const grid = useGridStore();
  const step = grid.visible ? grid.size : 1;
  return (value: number) => Math.round(value / step) * step;
}

/**
 * Arrastre de un vértice. Al empezar se guarda un checkpoint (todo el gesto se
 * deshace de una vez); con `inserting`, primero se crea el vértice nuevo en esa
 * posición. Con la cuadrícula visible, el vértice se ajusta a sus celdas.
 */
function useWaypointDrag(edgeId: string) {
  const { screenToFlowPosition } = useReactFlow();
  const snapValue = useSnap();

  return (event: ReactPointerEvent, waypoints: Position[], index: number, inserting?: Position) => {
    event.stopPropagation();
    event.preventDefault();
    store().checkpoint();

    const snap = (point: Position) => ({ x: snapValue(point.x), y: snapValue(point.y) });
    let points = inserting
      ? [...waypoints.slice(0, index), snap(inserting), ...waypoints.slice(index)]
      : [...waypoints];
    if (inserting) store().setEdgeWaypoints(edgeId, points);

    followPointer((moveEvent) => {
      const position = snap(screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY }));
      points = points.map((point, i) => (i === index ? position : point));
      store().setEdgeWaypoints(edgeId, points);
    });
  };
}

/**
 * Arrastre vertical de una conexión horizontal: cambia su altura, que se guarda
 * medida desde el borde superior del nodo de origen (core/model/horizontalEdge).
 */
function useHeightDrag(edgeId: string) {
  const { screenToFlowPosition } = useReactFlow();
  const snapValue = useSnap();

  return (event: ReactPointerEvent, edge: DiagramEdge) => {
    event.stopPropagation();
    event.preventDefault();
    const diagram = store().diagram;
    const source = diagram?.nodes.find((node) => node.id === edge.sourceId);
    if (!diagram || !source) return;
    store().checkpoint();
    const top = absolutePosition(diagram, source).y;

    followPointer((moveEvent) => {
      const y = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY }).y;
      // No sube por encima del borde superior del participante.
      const offset = Math.max(0, snapValue(y - top));
      store().setEdgeProps(edgeId, { ...edge.props, [EDGE_OFFSET_KEY]: offset });
    });
  };
}

/** Pasado este recorrido (en píxeles de pantalla) un clic se vuelve arrastre: así el doble clic sigue editando. */
const DRAG_THRESHOLD = 3;

/**
 * Arrastre del texto de una flecha: guarda su desplazamiento respecto del punto
 * medio (core/model/edgeLabel). Todo el gesto es un solo paso de deshacer.
 */
function useLabelDrag() {
  const { getZoom } = useReactFlow();

  return (event: ReactPointerEvent, edge: DiagramEdge) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const origin = { x: event.clientX, y: event.clientY };
    const base = readLabelOffset(edge);
    let dragging = false;

    followPointer((moveEvent) => {
      const zoom = getZoom();
      const dx = (moveEvent.clientX - origin.x) / zoom;
      const dy = (moveEvent.clientY - origin.y) / zoom;
      if (!dragging) {
        if (Math.hypot(moveEvent.clientX - origin.x, moveEvent.clientY - origin.y) < DRAG_THRESHOLD) return;
        dragging = true;
        store().checkpoint();
      }
      const offset = { x: Math.round(base.x + dx), y: Math.round(base.y + dy) };
      store().setEdgeProps(edge.id, { ...edge.props, [LABEL_OFFSET_KEY]: offset });
    });
  };
}

/** Sigue el puntero hasta que se suelta el botón. */
function followPointer(onMove: (event: PointerEvent) => void): void {
  const stop = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', stop);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', stop);
}
