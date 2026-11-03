import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  ReactFlow,
  SelectionMode,
  useKeyPress,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type IsValidConnection,
  type NodeChange,
  type OnConnectEnd,
  type OnDelete,
  type OnNodeDrag,
} from '@xyflow/react';
import { DEFAULT_EDGE_SHAPE, absolutePosition, findContainerAt, snapContainerPosition, type Diagram, type DiagramNode, type NodeMove } from '@/core/model';
import { isMagnetic, type DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { createId } from '@/core/utils/id';
import { toFlowEdges, toFlowNodes, type ArtifactFlowNode, type FlowEdge } from './adapters';
import { ArtifactNodeView } from './ArtifactNodeView';
import { ARTIFACT_DRAG_MIME } from './dragAndDrop';
import { FlowEdgeView } from './FlowEdgeView';
import { useActiveModule } from './useActiveModule';
import { useContextMenuStore, type ContextMenuTarget } from './contextMenuStore';
import { useElementClickStore } from './elementClickStore';
import { useGridStore } from './gridStore';
import { useHighlightStore, type Highlight } from './highlightStore';
import { LassoLayer } from './LassoLayer';
import { LockBadges } from './LockBadges';
import { centerInParent, placeArtifact } from './placeArtifact';
import { canvasPresentation } from './canvasView';
import { useCanvasViewStore } from './canvasViewStore';
import { useCanvasInteractionStore } from './canvasInteractionStore';

// Fuera del componente: React Flow pide que estos objetos no cambien entre renders.
const nodeTypes = { artifact: ArtifactNodeView };
const edgeTypes = { flow: FlowEdgeView };

const NOTICE_DURATION_MS = 3500;

/** Paso de ajuste cuando no se muestra la cuadrícula: los nodos se alinean sin que se note. */
const FREE_SNAP_STEP = 10;

/**
 * Margen al encuadrar: deja libres la barra superior, el panel de la derecha y
 * la barra de problemas inferior (44 px de alto, separada 12 px del borde).
 */
function fitPadding(): { top: `${number}px`; left: `${number}px`; right: `${number}px`; bottom: `${number}px` } {
  const wide = window.innerWidth >= WIDE_SCREEN;
  return { top: '76px', left: '24px', right: wide ? '400px' : '24px', bottom: '76px' } as const;
}

/** Ancho a partir del cual el panel de la derecha convive con el lienzo. */
const WIDE_SCREEN = 1024;

/** Al encuadrar un problema, el panel de problemas está desplegado abajo: se reserva su alto. */
const highlightFitPadding = () => ({ ...fitPadding(), bottom: '45%' }) as const;

/**
 * Lienzo basado en React Flow, conectado al store mediante los adaptadores.
 * Debe estar dentro de un <ReactFlowProvider> (lo pone AppShell, para que la
 * barra superior también pueda usar el lienzo, p. ej. al exportar una imagen).
 */
export function DiagramCanvas() {
  const module = useActiveModule();
  const diagram = useDiagramStore((state) => state.diagram);
  const selection = useDiagramStore((state) => state.selection);
  const { screenToFlowPosition } = useReactFlow();
  const { notice, showNotice } = useNotice();
  useUndoRedoShortcuts();
  useFitViewOnOpen(diagram?.id);
  useResetViewOnOpen(diagram?.id);
  const highlight = useHighlightStore((state) => state.highlight);
  useFitViewOnHighlight(highlight);
  const grid = useGridStore();
  const viewMode = useCanvasViewStore((state) => state.mode);
  const detailMode = useCanvasViewStore((state) => state.detail);
  const focus = useCanvasViewStore((state) => state.focus);
  const canvasTool = useCanvasInteractionStore((state) => state.tool);
  const panKeyHeld = useKeyPress('Alt');
  const [zoom, setZoom] = useState(1);
  // Con cuadrícula visible, los nodos se ajustan a sus celdas; sin ella, a un paso fino.
  const snapStep = grid.visible ? grid.size : FREE_SNAP_STEP;

  const canvasHighlight = useMemo(
    () => ({
      ids: new Set([...(highlight?.nodeIds ?? []), ...(highlight?.edgeIds ?? [])]),
      className: highlight ? `trazo-highlight trazo-highlight-${highlight.tone}` : '',
    }),
    [highlight],
  );
  const presentation = useMemo(
    () => diagram ? canvasPresentation(diagram, selection, viewMode, focus) : undefined,
    [diagram, selection, viewMode, focus],
  );
  const nodes = useMemo(
    () => (diagram && module ? toFlowNodes(diagram, module, selection, canvasHighlight, presentation) : []),
    [diagram, module, selection, canvasHighlight, presentation, canvasTool],
  );
  const edges = useMemo(
    () => (diagram && module ? toFlowEdges(diagram, module, selection, canvasHighlight, presentation) : []),
    [diagram, module, selection, canvasHighlight, presentation],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<ArtifactFlowNode>[]) => module && applyNodeChanges(module, changes),
    [module],
  );
  const onEdgesChange = useCallback((changes: EdgeChange<FlowEdge>[]) => applyEdgeSelection(changes), []);

  const onNodeDragStart = useCallback<OnNodeDrag<ArtifactFlowNode>>(() => {
    store().checkpoint();
    clearElementClick();
  }, []);

  const onNodeDragStop = useCallback<OnNodeDrag<ArtifactFlowNode>>(
    (_event, _node, draggedNodes) => {
      if (module) placeIntoContainers(module, draggedNodes.map((node) => node.id));
    },
    [module],
  );

  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      const current = store().diagram;
      if (!current || !module) return false;
      return module.resolveConnection(current, connection.source, connection.target).allowed;
    },
    [module],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const current = store().diagram;
      if (!current || !module) return;
      const result = module.resolveConnection(current, connection.source, connection.target);
      if (!result.allowed) return showNotice(result.reason);
      store().connect({
        id: createId(),
        artifactType: result.edgeType,
        sourceId: connection.source,
        targetId: connection.target,
        guard: null,
        ...DEFAULT_EDGE_SHAPE,
        waypoints: [],
        ...(module.initialEdge?.(current, result.edgeType, connection.source, connection.target) ?? { label: '', props: {} }),
      });
    },
    [module, showNotice],
  );

  /** Si se soltó sobre un nodo pero la conexión no es válida, explica por qué. */
  const onConnectEnd = useCallback<OnConnectEnd>(
    (_event, connectionState) => {
      const current = store().diagram;
      const { fromNode, toNode, isValid } = connectionState;
      if (!current || !module || !fromNode || !toNode || isValid !== false) return;
      const result = module.resolveConnection(current, fromNode.id, toNode.id);
      if (!result.allowed) showNotice(result.reason);
    },
    [module, showNotice],
  );

  const onDelete = useCallback<OnDelete<ArtifactFlowNode, FlowEdge>>(({ nodes: deletedNodes, edges: deletedEdges }) => {
    store().removeElements({
      nodeIds: deletedNodes.map((node) => node.id),
      edgeIds: deletedEdges.map((edge) => edge.id),
    });
  }, []);

  const onDragOver = useCallback((event: DragEvent) => {
    if (!event.dataTransfer.types.includes(ARTIFACT_DRAG_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      const artifactType = event.dataTransfer.getData(ARTIFACT_DRAG_MIME);
      if (!artifactType || !module) return;
      event.preventDefault();
      placeArtifact(module, artifactType, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    },
    [module, screenToFlowPosition],
  );

  return (
    <div className={`relative size-full ${(detailMode === 'compact' || (detailMode === 'auto' && zoom < 0.62)) ? 'trazo-detail-compact' : ''}`} onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow<ArtifactFlowNode, FlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        onDelete={onDelete}
        onEdgeDoubleClick={(_event, edge) => store().startEditingEdge(edge.id)}
        onNodeClick={(event, node) => publishNodeClick(event, node.id)}
        onEdgeClick={(event, edge) => publishEdgeClick(event, edge.id)}
        onMoveStart={(event) => {
          if (!event) return;
          clearElementClick();
          useContextMenuStore.getState().close();
        }}
        onMove={(_event, viewport) => setZoom(viewport.zoom)}
        onPaneContextMenu={(event) => openContextMenu(event, { kind: 'pane' }, screenToFlowPosition)}
        onNodeContextMenu={(event, node) => openContextMenu(event, { kind: 'node', id: node.id }, screenToFlowPosition)}
        onEdgeContextMenu={(event, edge) => openContextMenu(event, { kind: 'edge', id: edge.id }, screenToFlowPosition)}
        onPaneClick={() => {
          useHighlightStore.getState().setHighlight(null);
          clearElementClick();
        }}
        multiSelectionKeyCode="Shift"
        selectionKeyCode={null}
        // Puntero: arrastrar sobre el fondo traza un recuadro (solo cuenta lo que queda
        // entero dentro, así un carril no se selecciona por rozarlo); la rueda del medio desplaza.
        selectionOnDrag={canvasTool === 'pointer'}
        selectionMode={SelectionMode.Full}
        // Mantener Alt y arrastrar desplaza la vista con cualquier herramienta.
        panOnDrag={[1]}
        panActivationKeyCode="Alt"
        nodesDraggable={canvasTool === 'pointer'}
        nodesConnectable={canvasTool === 'pointer'}
        deleteKeyCode={['Delete', 'Backspace']}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: 'var(--color-accent)', strokeWidth: 1.5 }}
        connectionRadius={28}
        elevateNodesOnSelect={false}
        snapToGrid
        snapGrid={[snapStep, snapStep]}
        minZoom={0.25}
        maxZoom={2}
        zoomOnDoubleClick={false}
      >
        <svg className="pointer-events-none absolute size-0" aria-hidden>
          <defs>
            <marker id="trazo-diamond-open" markerWidth="14" markerHeight="10" refX="2" refY="5" orient="auto-start-reverse" markerUnits="strokeWidth">
              <path d="M1 5 7 1 13 5 7 9Z" fill="var(--color-shape-fill)" stroke="var(--color-edge)" strokeWidth="1.2" />
            </marker>
            <marker id="trazo-diamond-filled" markerWidth="14" markerHeight="10" refX="2" refY="5" orient="auto-start-reverse" markerUnits="strokeWidth">
              <path d="M1 5 7 1 13 5 7 9Z" fill="var(--color-edge)" stroke="var(--color-edge)" strokeWidth="1.2" />
            </marker>
          </defs>
        </svg>
        {grid.visible ? (
          <Background variant={BackgroundVariant.Lines} gap={grid.size} lineWidth={1} color="var(--color-line)" />
        ) : (
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="var(--color-dot)" />
        )}
        {/* Con Alt presionado el lápiz se aparta para dejar desplazar la vista. */}
        {canvasTool === 'lasso' && !panKeyHeld && module && <LassoLayer module={module} />}
        <Controls position="bottom-left" showInteractive={false} />
        <LockBadges />
      </ReactFlow>

      {notice && (
        <div
          role="status"
          className="pointer-events-none absolute top-20 left-1/2 z-30 max-w-md -translate-x-1/2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink-600 shadow-panel"
        >
          {notice}
        </div>
      )}
    </div>
  );
}

const store = () => useDiagramStore.getState();

const clearElementClick = () => useElementClickStore.getState().setClicked(null);

/** Clic derecho: en vez del menú del navegador, el de Trazo, en el punto exacto del clic. */
function openContextMenu(
  event: ReactMouseEvent | MouseEvent,
  target: ContextMenuTarget,
  screenToFlowPosition: (point: { x: number; y: number }) => { x: number; y: number },
): void {
  event.preventDefault();
  clearElementClick();
  const screen = { x: event.clientX, y: event.clientY };
  useContextMenuStore.getState().open({ target, screen, flow: screenToFlowPosition(screen) });
}

/** Publica el clic en un nodo con el rectángulo del nodo en pantalla (para ubicar el popup a su lado). */
function publishNodeClick(event: ReactMouseEvent, nodeId: string): void {
  // Con Shift, React Flow ya agregó o quitó el nodo de la selección (multiSelectionKeyCode):
  // aquí solo se evita abrir el popup de un único elemento.
  if (event.shiftKey) return clearElementClick();
  const element = (event.target as Element).closest('.react-flow__node');
  const rect = (element ?? (event.currentTarget as Element)).getBoundingClientRect();
  useElementClickStore.getState().setClicked({ kind: 'node', id: nodeId, rect });
}

/** En una flecha no hay rectángulo útil: se usa el punto exacto donde se hizo clic. */
function publishEdgeClick(event: ReactMouseEvent, edgeId: string): void {
  if (event.shiftKey) return clearElementClick();
  const rect = { left: event.clientX, top: event.clientY, right: event.clientX, bottom: event.clientY };
  useElementClickStore.getState().setClicked({ kind: 'edge', id: edgeId, rect });
}

/**
 * Traduce los avisos de React Flow a acciones del store. Las posiciones y tamaños
 * durante un gesto no crean pasos de deshacer (el checkpoint se tomó al empezar).
 * Los contenedores sueltos que se mueven se "pegan" a sus vecinos (imán).
 */
function applyNodeChanges(module: DiagramModule, changes: NodeChange<ArtifactFlowNode>[]): void {
  const diagram = store().diagram;
  const isContainer = (node: DiagramNode) => module.nodeKinds[node.artifactType]?.isContainer ?? false;
  const moves: NodeMove[] = [];
  // Al redimensionar desde la izquierda o arriba también cambia la posición; el imán
  // no debe actuar ahí, o devolvería el borde a su vecino y crecería el lado opuesto.
  const resizing = new Set(changes.flatMap((change) => (change.type === 'dimensions' && change.resizing ? [change.id] : [])));
  for (const change of changes) {
    if (change.type !== 'position' || !change.position) continue;
    const node = diagram?.nodes.find((candidate) => candidate.id === change.id);
    const kind = node && module.nodeKinds[node.artifactType];
    // Los que solo se deslizan en horizontal conservan su fila.
    const requested = kind?.dragAxis === 'x' && node ? { x: change.position.x, y: node.position.y } : change.position;
    const snapsToNeighbors = diagram && node && kind && node.parentId === null && isMagnetic(kind) && !resizing.has(change.id);
    const position = snapsToNeighbors
      ? snapContainerPosition(diagram, node.id, requested, node.size, isContainer)
      : requested;
    moves.push({ id: change.id, position });
  }
  for (const change of changes) {
    if (change.type === 'dimensions' && change.resizing && change.dimensions) {
      store().resizeNode(change.id, { width: change.dimensions.width, height: change.dimensions.height });
    }
  }
  if (moves.length > 0) store().moveNodes(moves);

  const selectChanges = changes.filter((change) => change.type === 'select');
  if (selectChanges.length > 0) {
    const { selection } = store();
    store().setSelection({ ...selection, nodeIds: applySelect(selection.nodeIds, selectChanges) });
  }
}

function applyEdgeSelection(changes: EdgeChange<FlowEdge>[]): void {
  const selectChanges = changes.filter((change) => change.type === 'select');
  if (selectChanges.length === 0) return;
  const { selection } = store();
  store().setSelection({ ...selection, edgeIds: applySelect(selection.edgeIds, selectChanges) });
}

function applySelect(current: string[], changes: { id: string; selected: boolean }[]): string[] {
  const ids = new Set(current);
  for (const change of changes) {
    if (change.selected) ids.add(change.id);
    else ids.delete(change.id);
  }
  return [...ids];
}

/** Al soltar nodos tras arrastrarlos, entran en el carril que quede bajo su centro (o salen de él). */
function placeIntoContainers(module: DiagramModule, draggedIds: string[]): void {
  const diagram = store().diagram;
  if (!diagram) return;
  const isContainer = (node: DiagramNode) => module.nodeKinds[node.artifactType]?.isContainer ?? false;
  const dragged = new Set(draggedIds);

  // Los contenedores no se anidan, y un hijo arrastrado junto con su padre ya se mueve con él.
  const candidates = diagram.nodes.filter(
    (node) => dragged.has(node.id) && !isContainer(node) && !(node.parentId && dragged.has(node.parentId)),
  );
  for (const node of candidates) {
    const container = findContainerAt(diagram, centerOf(diagram, node), isContainer, node.id);
    store().reparentNodes([node.id], container?.id ?? null);
    if (container && module.nodeKinds[node.artifactType]?.centerInContainer) centerInParent(node.id);
  }
}

function centerOf(diagram: Diagram, node: DiagramNode) {
  const origin = absolutePosition(diagram, node);
  return { x: origin.x + node.size.width / 2, y: origin.y + node.size.height / 2 };
}

function useNotice() {
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { notice, showNotice };
}

/** Al abrir otro diagrama (p. ej. desde una plantilla), lo encuadra completo en pantalla. */
function useFitViewOnOpen(diagramId: string | undefined) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (!diagramId) return;
    // Se espera un fotograma para que React Flow ya tenga los nodos nuevos.
    const frame = window.requestAnimationFrame(() => void fitView({ padding: fitPadding(), maxZoom: 1 }));
    return () => window.cancelAnimationFrame(frame);
  }, [diagramId, fitView]);
}

function useResetViewOnOpen(diagramId: string | undefined) {
  useEffect(() => {
    if (diagramId) useCanvasViewStore.getState().reset();
  }, [diagramId]);
}

/**
 * Al resaltar un problema, encuadra sus elementos (en una conexión, sus dos extremos).
 * Sin elementos concretos (p. ej. "falta el nodo inicial") no mueve la vista.
 */
function useFitViewOnHighlight(highlight: Highlight | null) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const diagram = store().diagram;
    if (!highlight || !diagram) return;
    const edgeEnds = diagram.edges
      .filter((edge) => highlight.edgeIds.includes(edge.id))
      .flatMap((edge) => [edge.sourceId, edge.targetId]);
    const ids = [...new Set([...highlight.nodeIds, ...edgeEnds])];
    if (ids.length === 0) return;
    void fitView({ nodes: ids.map((id) => ({ id })), padding: highlightFitPadding(), maxZoom: 1, duration: 350 });
  }, [highlight, fitView]);
}

/** Ctrl+Z deshace; Ctrl+Y o Ctrl+Mayús+Z rehace. No interfiere al escribir texto. */
function useUndoRedoShortcuts() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      if (!(event.ctrlKey || event.metaKey)) return;

      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        store().undo();
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        store().redo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
