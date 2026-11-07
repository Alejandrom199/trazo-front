import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  ReactFlow,
  SelectionMode,
  useKeyPress,
  useStore,
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
import { useUiStore } from '@/ui/uiStore';
import { HOLLOW_TRIANGLE_MARKER, toFlowEdges, toFlowNodes, type ArtifactFlowNode, type FlowEdge } from './adapters';
import { ArtifactNodeView } from './ArtifactNodeView';
import { ARTIFACT_DRAG_MIME } from './dragAndDrop';
import { FlowEdgeView } from './FlowEdgeView';
import { useActiveModule } from './useActiveModule';
import { useContextMenuStore, type ContextMenuTarget } from './contextMenuStore';
import { useGridStore } from './gridStore';
import { useHighlightStore, type Highlight } from './highlightStore';
import { GuideLines, useGuidesStore } from './GuideLines';
import { snapToGuides, type Guide } from './alignmentGuides';
import { useClipboardShortcuts } from './clipboardActions';
import { useLayerShortcuts } from './layerActions';
import { LassoLayer } from './LassoLayer';
import { LockBadges } from './LockBadges';
import { centerInParent, placeArtifact } from './placeArtifact';
import { canvasPresentation } from './canvasView';
import { useCanvasViewStore } from './canvasViewStore';
import { useCanvasInteractionStore } from './canvasInteractionStore';
import { chosenEdgeType } from './edgeTypeChoice';

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
  const { screenToFlowPosition, getZoom } = useReactFlow();
  const { notice, showNotice } = useNotice();
  useUndoRedoShortcuts();
  useClipboardShortcuts(module);
  useLayerShortcuts(module);
  // El conector elegido en la paleta es de este tipo de diagrama: al cambiar de tipo se olvida.
  useEffect(() => useCanvasInteractionStore.getState().setNextEdgeType(null), [module?.diagramType]);
  useFitViewOnOpen(diagram?.id);
  useResetViewOnOpen(diagram?.id);
  const highlight = useHighlightStore((state) => state.highlight);
  useFitViewOnHighlight(highlight);
  const grid = useGridStore();
  const detailMode = useCanvasViewStore((state) => state.detail);
  const focus = useCanvasViewStore((state) => state.focus);
  const canvasTool = useCanvasInteractionStore((state) => state.tool);
  const panKeyHeld = useKeyPress('Alt');
  // Zoom actual de la vista (también tras encuadrar al abrir, no solo al desplazarse).
  const zoom = useStore((state) => state.transform[2]);
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
    () => diagram ? canvasPresentation(diagram, selection, focus) : undefined,
    [diagram, selection, focus],
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
    (changes: NodeChange<ArtifactFlowNode>[]) => module && applyNodeChanges(module, changes, getZoom()),
    [module, getZoom],
  );
  const onEdgesChange = useCallback((changes: EdgeChange<FlowEdge>[]) => applyEdgeSelection(changes), []);

  const onNodeDragStart = useCallback<OnNodeDrag<ArtifactFlowNode>>(() => {
    store().checkpoint();
  }, []);

  const onNodeDragStop = useCallback<OnNodeDrag<ArtifactFlowNode>>(
    (_event, _node, draggedNodes) => {
      useGuidesStore.getState().setGuides([]);
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
      const edgeType = chosenEdgeType(module, result.edgeType, useCanvasInteractionStore.getState().nextEdgeType);
      const id = createId();
      store().connect({
        id,
        artifactType: edgeType,
        sourceId: connection.source,
        targetId: connection.target,
        guard: null,
        ...DEFAULT_EDGE_SHAPE,
        waypoints: [],
        ...(module.initialEdge?.(current, edgeType, connection.source, connection.target) ?? { label: '', props: {} }),
      });
      // Deja solo la flecha nueva seleccionada para poder cambiar su tipo al instante.
      store().setSelection({ nodeIds: [], edgeIds: [id] });
      useUiStore.getState().setInspectorTab('properties');
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
    <div
      className={`relative size-full ${(detailMode === 'compact' || (detailMode === 'auto' && zoom < 0.62)) ? 'trazo-detail-compact' : ''}`}
      // El CSS lo usa para que lo que se agarra (p. ej. los bordes de redimensionar) mida lo mismo en pantalla a cualquier zoom.
      style={{ '--trazo-zoom': zoom } as CSSProperties}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
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
        // Con la mano solo se navega: un clic no abre el popup de nada.
        onNodeClick={(event, node) => canvasTool !== 'hand' && publishNodeClick(event, node.id)}
        onEdgeClick={(event, edge) => canvasTool !== 'hand' && publishEdgeClick(event, edge.id)}
        onMoveStart={(event) => {
          if (!event) return;
          useContextMenuStore.getState().close();
        }}
        onPaneContextMenu={(event) => openContextMenu(event, { kind: 'pane' }, screenToFlowPosition)}
        onNodeContextMenu={(event, node) => openContextMenu(event, { kind: 'node', id: node.id }, screenToFlowPosition)}
        onEdgeContextMenu={(event, edge) => openContextMenu(event, { kind: 'edge', id: edge.id }, screenToFlowPosition)}
        onPaneClick={() => {
          useHighlightStore.getState().setHighlight(null);
        }}
        multiSelectionKeyCode="Shift"
        selectionKeyCode={null}
        // Puntero: arrastrar sobre el fondo traza un recuadro (solo cuenta lo que queda
        // entero dentro, así un carril no se selecciona por rozarlo); la rueda del medio desplaza.
        selectionOnDrag={canvasTool === 'pointer'}
        selectionMode={SelectionMode.Full}
        // Mantener Alt y arrastrar desplaza la vista con cualquier herramienta.
        panOnDrag={canvasTool === 'hand' ? true : [1]}
        panActivationKeyCode="Alt"
        nodesDraggable={canvasTool === 'pointer'}
        nodesConnectable={canvasTool === 'pointer'}
        elementsSelectable={canvasTool !== 'hand'}
        deleteKeyCode={['Delete', 'Backspace']}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: 'var(--color-accent)', strokeWidth: 1.5 }}
        connectionRadius={28}
        elevateNodesOnSelect={false}
        // La flecha seleccionada se dibuja sobre los nodos: si un vértice la lleva por
        // detrás de uno, se ve todo su recorrido mientras se edita.
        elevateEdgesOnSelect
        snapToGrid
        snapGrid={[snapStep, snapStep]}
        minZoom={0.25}
        maxZoom={2}
        zoomOnDoubleClick={false}
      >
        <svg className="pointer-events-none absolute size-0" aria-hidden>
          <defs>
            <marker id={HOLLOW_TRIANGLE_MARKER} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
              <path d="M1 1 11 6 1 11Z" fill="var(--color-board)" stroke="var(--color-edge)" strokeWidth="1.3" strokeLinejoin="round" />
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
        <LockBadges />
        <GuideLines />
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

/** Clic derecho: en vez del menú del navegador, el de Trazo, en el punto exacto del clic. */
function openContextMenu(
  event: ReactMouseEvent | MouseEvent,
  target: ContextMenuTarget,
  screenToFlowPosition: (point: { x: number; y: number }) => { x: number; y: number },
): void {
  event.preventDefault();
  const screen = { x: event.clientX, y: event.clientY };
  useContextMenuStore.getState().open({ target, screen, flow: screenToFlowPosition(screen) });
}

/**
 * Un clic simple deja solo ese elemento seleccionado y abre sus propiedades.
 * Sin esto, nodos y flechas pueden quedar juntos en la selección y el inspector
 * entra en modo múltiple sin el cambio de tipo de la conexión.
 * Shift conserva la selección múltiple de React Flow.
 */
function publishNodeClick(event: ReactMouseEvent, nodeId: string): void {
  if (event.shiftKey) return;
  store().setSelection({ nodeIds: [nodeId], edgeIds: [] });
  useUiStore.getState().setInspectorTab('properties');
}

function publishEdgeClick(event: ReactMouseEvent, edgeId: string): void {
  if (event.shiftKey) return;
  store().setSelection({ nodeIds: [], edgeIds: [edgeId] });
  useUiStore.getState().setInspectorTab('properties');
}

/** Distancia en pantalla a la que una guía atrae al nodo: igual a cualquier zoom. */
const GUIDE_SCREEN_DISTANCE = 8;

/**
 * Ajusta un nodo que se arrastra a los bordes y centros de los demás (ver
 * alignmentGuides). Se compara en coordenadas absolutas con los nodos que no son
 * contenedores ni marcos, sin contar los suyos propios (sus hijos).
 */
function alignToNeighbors(module: DiagramModule, diagram: Diagram, node: DiagramNode, position: { x: number; y: number }, threshold: number) {
  const parent = node.parentId ? diagram.nodes.find((candidate) => candidate.id === node.parentId) : undefined;
  const origin = parent ? absolutePosition(diagram, parent) : { x: 0, y: 0 };
  const others = diagram.nodes
    .filter((other) => other.id !== node.id && other.parentId !== node.id)
    .filter((other) => {
      const kind = module.nodeKinds[other.artifactType];
      return kind && !kind.isContainer && !kind.gripOnly;
    })
    .map((other) => ({ ...absolutePosition(diagram, other), ...other.size }));
  const snap = snapToGuides({ x: origin.x + position.x, y: origin.y + position.y, ...node.size }, others, threshold);
  return { position: { x: snap.position.x - origin.x, y: snap.position.y - origin.y }, guides: snap.guides };
}

function applyNodeChanges(module: DiagramModule, changes: NodeChange<ArtifactFlowNode>[], zoom: number): void {
  const diagram = store().diagram;
  const isContainer = (node: DiagramNode) => module.nodeKinds[node.artifactType]?.isContainer ?? false;
  const moves: NodeMove[] = [];
  // Al redimensionar desde la izquierda o arriba también cambia la posición; el imán
  // no debe actuar ahí, o devolvería el borde a su vecino y crecería el lado opuesto.
  const resizing = new Set(changes.flatMap((change) => (change.type === 'dimensions' && change.resizing ? [change.id] : [])));
  // Las guías de alineación solo se usan al arrastrar un único nodo.
  const dragged = changes.filter((change) => change.type === 'position' && change.dragging);
  let guides: Guide[] = [];
  for (const change of changes) {
    if (change.type !== 'position' || !change.position) continue;
    const node = diagram?.nodes.find((candidate) => candidate.id === change.id);
    const kind = node && module.nodeKinds[node.artifactType];
    // Los que solo se deslizan en horizontal conservan su fila.
    const requested = kind?.dragAxis === 'x' && node ? { x: change.position.x, y: node.position.y } : change.position;
    const snapsToNeighbors = diagram && node && kind && node.parentId === null && isMagnetic(kind) && !resizing.has(change.id);
    let position = snapsToNeighbors
      ? snapContainerPosition(diagram, node.id, requested, node.size, isContainer)
      : requested;
    if (diagram && node && kind && !snapsToNeighbors && dragged.length === 1 && change.dragging) {
      const snap = alignToNeighbors(module, diagram, node, position, GUIDE_SCREEN_DISTANCE / zoom);
      position = kind.dragAxis === 'x' ? { x: snap.position.x, y: position.y } : snap.position;
      guides = snap.guides;
    }
    moves.push({ id: change.id, position });
  }
  // Solo los lotes con movimientos cambian las guías (otros lotes, como la selección, no las borran).
  if (changes.some((change) => change.type === 'position')) useGuidesStore.getState().setGuides(guides);
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

  // Solo los contenedores marcados como anidables entran en otro; un hijo arrastrado
  // junto con su padre ya se mueve con él.
  const placeable = (node: DiagramNode) => !isContainer(node) || (module.nodeKinds[node.artifactType]?.nestable ?? false);
  const candidates = diagram.nodes.filter(
    (node) => dragged.has(node.id) && placeable(node) && !(node.parentId && dragged.has(node.parentId)),
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
