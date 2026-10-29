import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type IsValidConnection,
  type NodeChange,
  type OnConnectEnd,
  type OnDelete,
  type OnNodeDrag,
} from '@xyflow/react';
import { absolutePosition, findContainerAt, type Diagram, type DiagramNode, type ElementIds, type NodeMove } from '@/core/model';
import { createNode, type DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { createId } from '@/core/utils/id';
import { toFlowEdges, toFlowNodes, type ArtifactFlowNode, type FlowEdge } from './adapters';
import { ArtifactNodeView } from './ArtifactNodeView';
import { ARTIFACT_DRAG_MIME } from './dragAndDrop';
import { FlowEdgeView } from './FlowEdgeView';
import { useActiveModule } from './useActiveModule';
import { useHighlightStore, type Highlight } from './highlightStore';

// Fuera del componente: React Flow pide que estos objetos no cambien entre renders.
const nodeTypes = { artifact: ArtifactNodeView };
const edgeTypes = { flow: FlowEdgeView };

const NOTICE_DURATION_MS = 3500;

/** Margen al encuadrar: deja libre el espacio de la barra superior y los paneles flotantes. */
const FIT_PADDING = { top: '84px', left: '270px', right: '350px', bottom: '24px' } as const;

/** Al encuadrar un problema, el panel de problemas está desplegado abajo: se reserva su alto. */
const HIGHLIGHT_FIT_PADDING = { ...FIT_PADDING, bottom: '45%' } as const;

/** Lienzo basado en React Flow, conectado al store mediante los adaptadores. */
export function DiagramCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}

function CanvasContent() {
  const module = useActiveModule();
  const diagram = useDiagramStore((state) => state.diagram);
  const selection = useDiagramStore((state) => state.selection);
  const { screenToFlowPosition } = useReactFlow();
  const { notice, showNotice } = useNotice();
  useUndoRedoShortcuts();
  useFitViewOnOpen(diagram?.id);
  const highlight = useHighlightStore((state) => state.highlight);
  useFitViewOnHighlight(highlight);

  const canvasHighlight = useMemo(
    () => ({
      ids: new Set([...(highlight?.nodeIds ?? []), ...(highlight?.edgeIds ?? [])]),
      className: highlight ? `trazo-highlight trazo-highlight-${highlight.severity}` : '',
    }),
    [highlight],
  );
  const nodes = useMemo(
    () => (diagram && module ? toFlowNodes(diagram, module, selection, canvasHighlight) : []),
    [diagram, module, selection, canvasHighlight],
  );
  const edges = useMemo(
    () => (diagram && module ? toFlowEdges(diagram, module, selection, canvasHighlight) : []),
    [diagram, module, selection, canvasHighlight],
  );

  const onNodesChange = useCallback((changes: NodeChange<ArtifactFlowNode>[]) => applyNodeChanges(changes), []);
  const onEdgesChange = useCallback((changes: EdgeChange<FlowEdge>[]) => applyEdgeSelection(changes), []);

  const onNodeDragStart = useCallback<OnNodeDrag<ArtifactFlowNode>>(() => store().checkpoint(), []);

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
        label: '',
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
      dropArtifact(module, artifactType, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    },
    [module, screenToFlowPosition],
  );

  return (
    <div className="relative size-full" onDragOver={onDragOver} onDrop={onDrop}>
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
        onPaneClick={() => useHighlightStore.getState().setHighlight(null)}
        deleteKeyCode={['Delete', 'Backspace']}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: '#4f46e5', strokeWidth: 1.5 }}
        connectionRadius={28}
        elevateNodesOnSelect={false}
        snapToGrid
        snapGrid={[10, 10]}
        minZoom={0.25}
        maxZoom={2}
        zoomOnDoubleClick={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#d4d4d8" />
        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>

      {notice && (
        <div
          role="status"
          className="pointer-events-none absolute bottom-6 left-1/2 max-w-md -translate-x-1/2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink-600 shadow-panel"
        >
          {notice}
        </div>
      )}
    </div>
  );
}

const store = () => useDiagramStore.getState();

/**
 * Traduce los avisos de React Flow a acciones del store. Las posiciones y tamaños
 * durante un gesto no crean pasos de deshacer (el checkpoint se tomó al empezar).
 */
function applyNodeChanges(changes: NodeChange<ArtifactFlowNode>[]): void {
  const moves: NodeMove[] = [];
  for (const change of changes) {
    if (change.type === 'position' && change.position) moves.push({ id: change.id, position: change.position });
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
  }
}

function centerOf(diagram: Diagram, node: DiagramNode) {
  const origin = absolutePosition(diagram, node);
  return { x: origin.x + node.size.width / 2, y: origin.y + node.size.height / 2 };
}

/** Crea el artefacto centrado donde se soltó, dentro del carril si cayó en uno. */
function dropArtifact(module: DiagramModule, artifactType: string, point: { x: number; y: number }): void {
  const diagram = store().diagram;
  const kind = module.nodeKinds[artifactType];
  if (!diagram || !kind) return;

  const topLeft = { x: point.x - kind.defaultSize.width / 2, y: point.y - kind.defaultSize.height / 2 };
  const container = kind.isContainer
    ? null
    : findContainerAt(diagram, point, (node) => module.nodeKinds[node.artifactType]?.isContainer ?? false);
  const containerOrigin = container ? absolutePosition(diagram, container) : { x: 0, y: 0 };

  const node = createNode({
    artifactType,
    kind,
    position: { x: topLeft.x - containerOrigin.x, y: topLeft.y - containerOrigin.y },
    parentId: container?.id ?? null,
  });
  store().addNode(node);
  store().setSelection({ nodeIds: [node.id], edgeIds: [] } satisfies ElementIds);
  store().startEditing(kind.hasLabel ? node.id : null);
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
    const frame = window.requestAnimationFrame(() => void fitView({ padding: FIT_PADDING, maxZoom: 1 }));
    return () => window.cancelAnimationFrame(frame);
  }, [diagramId, fitView]);
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
    void fitView({ nodes: ids.map((id) => ({ id })), padding: HIGHLIGHT_FIT_PADDING, maxZoom: 1, duration: 350 });
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
