import { BaseEdge, EdgeLabelRenderer, useInternalNode, useReactFlow, type EdgeProps, type InternalNode } from '@xyflow/react';
import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { absolutePosition, EDGE_OFFSET_KEY, LABEL_OFFSET_KEY, readLabelOffset, type DiagramEdge, type Position } from '@/core/model';
import type { EdgeTextKind } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import type { FlowEdge } from './adapters';
import { connectionPath } from './connectionPath';
import { EditableText } from './EditableText';
import type { Rect } from './edgeGeometry';
import { sourceDiamondPath } from './edgeMarkers';
import { insertWaypoint, type EdgePath } from './edgePath';
import { snapPoint, useGridStore } from './gridStore';
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
 * (guarda [condición] o etiqueta libre). Seleccionada:
 *   - recorrido libre: arrastrar cualquier punto de la línea crea ahí un vértice y
 *     lo lleva con el puntero; cada vértice ● se arrastra y con doble clic se quita.
 *   - horizontal (mensaje): un tirador en su origen que la sube o la baja.
 */
export function FlowEdgeView({ id, source, target, data, style, markerEnd, selected }: EdgeProps<FlowEdge>) {
  const module = useActiveModule();
  const diagram = useDiagramStore((state) => state.diagram);
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const isEditing = useDiagramStore((state) => state.editingEdgeId === id);
  const startDrag = useWaypointDrag(id);
  const startLineDrag = useLineDrag(id);
  const startHeightDrag = useHeightDrag(id);
  const startLabelDrag = useLabelDrag();
  const reconnect = useReconnect(id);

  if (!sourceNode || !targetNode || !data || !module || !diagram) return null;

  const { edge } = data;
  const kind = module.edgeKinds[edge.artifactType];
  const path = connectionPath(diagram, module, edge, rectOf(sourceNode), rectOf(targetNode));
  const isHorizontal = kind?.layout === 'horizontal';
  const labelOffset = readLabelOffset(edge);
  const start = path.controlPoints[0];
  const toward = path.controlPoints[1] ?? path.controlPoints.at(-1);
  const stroke = typeof style?.stroke === 'string' ? style.stroke : 'var(--color-edge)';

  return (
    <>
      <BaseEdge
        id={id}
        path={path.d}
        style={reconnect.preview ? { ...style, opacity: 0.35 } : style}
        markerEnd={markerEnd}
        interactionWidth={16}
      />
      {selected && !isHorizontal && !reconnect.preview && (
        // Franja invisible sobre la línea seleccionada: arrastrarla crea un vértice donde se agarra.
        <path
          d={path.d}
          className="nodrag nopan"
          style={{ fill: 'none', stroke: 'transparent', strokeWidth: 16, cursor: 'grab', pointerEvents: 'stroke' }}
          onPointerDown={(event) => startLineDrag(event, edge.waypoints, path)}
        />
      )}
      {kind?.sourceMarker && start && toward && !reconnect.preview && (
        <path
          d={sourceDiamondPath(start, toward)}
          fill={kind.sourceMarker === 'diamond-filled' ? stroke : 'var(--color-shape-fill)'}
          stroke={stroke}
          strokeWidth={1.2}
          strokeLinejoin="round"
          style={{ pointerEvents: 'none' }}
        />
      )}
      {reconnect.preview && (
        // Vista previa mientras se arrastra un extremo hacia otro nodo.
        <path
          d={`M${reconnect.preview.from.x},${reconnect.preview.from.y} L${reconnect.preview.to.x},${reconnect.preview.to.y}`}
          // Sin eventos: al soltar, lo que está bajo el puntero debe ser el nodo, no esta línea.
          style={{ fill: 'none', stroke: 'var(--color-accent)', pointerEvents: 'none' }}
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
      )}
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
        {/* Extremos: se arrastran a otro nodo para reconectar la flecha. En un mensaje
            horizontal, el origen ya es el tirador de altura: solo se reconecta el destino. */}
        {selected &&
          (['source', 'target'] as const)
            .filter((end) => !(isHorizontal && end === 'source'))
            .map((end) => {
              const point = end === 'source' ? path.controlPoints[0]! : path.controlPoints.at(-1)!;
              const fixed = end === 'source' ? path.controlPoints.at(-1)! : path.controlPoints[0]!;
              return (
                <Handle
                  key={end}
                  point={point}
                  kind="end"
                  title="Arrastra este extremo a otro nodo para reconectar la flecha"
                  onPointerDown={(event) => reconnect.start(event, edge, end, fixed)}
                />
              );
            })}
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
        above ? 'text-ink-900' : 'bg-board text-ink-600'
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
  kind: 'vertex' | 'height' | 'end';
  title: string;
  onPointerDown: (event: ReactPointerEvent) => void;
  onDoubleClick?: () => void;
}

const HANDLE_SIZE = 11;

/**
 * Tirador de edición del recorrido, en coordenadas del lienzo. La posición va en
 * un contenedor sin tamaño y el agrandado al pasar el ratón en el tirador: si
 * `scale` y la traslación compartieran elemento, el escalado multiplicaría también
 * la traslación y el tirador saltaría lejos de su punto.
 */
function Handle({ point, kind, title, onPointerDown, onDoubleClick }: HandleProps) {
  return (
    <div className="absolute" style={{ transform: `translate(${point.x}px, ${point.y}px)`, zIndex: 1001 }}>
      <div
        title={title}
        onPointerDown={onPointerDown}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onDoubleClick?.();
        }}
        className={`nodrag nopan pointer-events-auto absolute border-[1.5px] border-accent transition-transform hover:scale-125 ${
          kind === 'end' ? 'rounded-[2px] bg-surface' : 'rounded-full bg-accent'
        } ${kind === 'height' ? 'cursor-ns-resize' : 'cursor-move'}`}
        style={{ width: HANDLE_SIZE, height: HANDLE_SIZE, left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 }}
      />
    </div>
  );
}

/** Ajuste a la cuadrícula: al tamaño de la celda si se ve; si no, píxel a píxel. */
function useSnap() {
  const grid = useGridStore();
  const step = grid.visible ? grid.size : 1;
  return (value: number) => Math.round(value / step) * step;
}

/**
 * Arrastre de un vértice existente. Al empezar se guarda un checkpoint (todo el
 * gesto se deshace de una vez). Con la cuadrícula visible, se ajusta a sus celdas.
 */
function useWaypointDrag(edgeId: string) {
  const { screenToFlowPosition } = useReactFlow();

  return (event: ReactPointerEvent, waypoints: Position[], index: number) => {
    event.stopPropagation();
    event.preventDefault();
    store().checkpoint();
    let points = [...waypoints];

    followPointer((moveEvent) => {
      const position = snapPoint(screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY }));
      points = points.map((point, i) => (i === index ? position : point));
      store().setEdgeWaypoints(edgeId, points);
    });
  };
}

/**
 * Arrastre desde la línea: pasado el umbral, crea un vértice en el punto donde se
 * agarró (en el tramo que corresponde) y lo lleva con el puntero. Un clic sin
 * arrastrar no crea nada, así el clic y el doble clic sobre la flecha siguen igual.
 */
function useLineDrag(edgeId: string) {
  const { screenToFlowPosition } = useReactFlow();

  return (event: ReactPointerEvent, waypoints: Position[], path: EdgePath) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const origin = { x: event.clientX, y: event.clientY };
    let points = waypoints;
    let index: number | null = null;

    followPointer((moveEvent) => {
      if (index === null) {
        if (Math.hypot(moveEvent.clientX - origin.x, moveEvent.clientY - origin.y) < DRAG_THRESHOLD) return;
        store().checkpoint();
        const inserted = insertWaypoint(path, waypoints, screenToFlowPosition(origin));
        points = inserted.waypoints;
        index = inserted.index;
      }
      const position = snapPoint(screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY }));
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

/**
 * Reconectar: se arrastra un extremo de la flecha y se suelta sobre otro nodo. Si
 * la conexión es válida (la misma regla del editor), la flecha pasa a ese nodo y
 * conserva su tipo si sigue valiendo; si no, vuelve a como estaba.
 */
function useReconnect(edgeId: string) {
  const { screenToFlowPosition } = useReactFlow();
  const module = useActiveModule();
  const [preview, setPreview] = useState<{ from: Position; to: Position } | null>(null);

  const start = (event: ReactPointerEvent, edge: DiagramEdge, end: 'source' | 'target', fixed: Position) => {
    event.stopPropagation();
    event.preventDefault();
    const move = (moveEvent: PointerEvent) => setPreview({ from: fixed, to: screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY }) });
    const finish = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      setPreview(null);
      const dropped = document.elementFromPoint(upEvent.clientX, upEvent.clientY)?.closest<HTMLElement>('.react-flow__node')?.dataset.id;
      const diagram = store().diagram;
      if (!dropped || !diagram || !module) return;
      const sourceId = end === 'source' ? dropped : edge.sourceId;
      const targetId = end === 'target' ? dropped : edge.targetId;
      if (sourceId === edge.sourceId && targetId === edge.targetId) return;
      const result = module.resolveConnection({ ...diagram, edges: diagram.edges.filter((other) => other.id !== edgeId) }, sourceId, targetId);
      if (!result.allowed) return;
      const keepsType = edge.artifactType === result.edgeType || module.edgeKinds[result.edgeType]?.switchableTo?.includes(edge.artifactType);
      store().updateEdge(edgeId, { sourceId, targetId, artifactType: keepsType ? edge.artifactType : result.edgeType, waypoints: [] });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
  };

  return { preview, start };
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
