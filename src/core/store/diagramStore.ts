import { create } from 'zustand';
import {
  addEdge,
  addNode,
  createEmptyDiagram,
  moveNodes,
  removeElements,
  reparentNode,
  updateEdge,
  updateNode,
  type Diagram,
  type DiagramEdge,
  type DiagramNode,
  type ElementIds,
  type NewDiagramInput,
  type NodeMove,
  type NodePatch,
  type EdgePatch,
  type Position,
  type Size,
} from '@/core/model';

/** Cuántos pasos de deshacer se conservan. */
const HISTORY_LIMIT = 100;

const EMPTY_SELECTION: ElementIds = { nodeIds: [], edgeIds: [] };

interface DiagramState {
  /** Diagrama abierto en el editor, o null si no hay ninguno. */
  diagram: Diagram | null;
  /** Versiones anteriores (la última es la más reciente). */
  past: Diagram[];
  /** Versiones deshechas, listas para rehacer. */
  future: Diagram[];
  selection: ElementIds;
  /** Nodo cuya etiqueta se está escribiendo. */
  editingNodeId: string | null;
  /** Conexión cuya guarda se está escribiendo. */
  editingEdgeId: string | null;

  newDiagram: (input: NewDiagramInput) => void;
  openDiagram: (diagram: Diagram) => void;
  renameDiagram: (name: string) => void;

  /**
   * Guarda la versión actual en el historial sin cambiarla. Se llama al EMPEZAR
   * un gesto continuo (arrastrar, redimensionar) para que todo el gesto se
   * deshaga de una vez, en lugar de píxel por píxel.
   */
  checkpoint: () => void;
  // Cambios continuos: no crean entrada en el historial (van precedidos de checkpoint).
  moveNodes: (moves: NodeMove[]) => void;
  resizeNode: (nodeId: string, size: Size) => void;
  reparentNodes: (nodeIds: string[], parentId: string | null) => void;
  /** Mueve los vértices de una flecha durante un arrastre (precedido de checkpoint). */
  setEdgeWaypoints: (edgeId: string, waypoints: Position[]) => void;
  /** Cambia propiedades de una flecha durante un arrastre (p. ej. la altura de un mensaje). */
  setEdgeProps: (edgeId: string, props: Record<string, unknown>) => void;
  // Cambios discretos: cada uno es un paso de deshacer.
  addNode: (node: DiagramNode) => void;
  connect: (edge: DiagramEdge) => void;
  /** Agrega varios nodos y flechas (pegar, duplicar) en un solo paso de deshacer, y los deja seleccionados. */
  addElements: (nodes: DiagramNode[], edges: DiagramEdge[]) => void;
  setNodeLabel: (nodeId: string, label: string) => void;
  /** Cambia propiedades de un nodo desde el panel de propiedades (un paso de deshacer). */
  updateNode: (nodeId: string, patch: NodePatch) => void;
  setEdgeGuard: (edgeId: string, guard: string | null) => void;
  /** Cambia trazado, vértices o estilo de una flecha (un paso de deshacer). */
  updateEdge: (edgeId: string, patch: EdgePatch) => void;
  /** Cambia varios nodos a la vez (selección múltiple): un solo paso de deshacer. */
  updateNodes: (changes: { id: string; patch: NodePatch }[]) => void;
  /** Cambia varias flechas a la vez (selección múltiple): un solo paso de deshacer. */
  updateEdges: (changes: { id: string; patch: EdgePatch }[]) => void;
  removeElements: (ids: ElementIds) => void;

  undo: () => void;
  redo: () => void;

  setSelection: (selection: ElementIds) => void;
  startEditing: (nodeId: string | null) => void;
  startEditingEdge: (edgeId: string | null) => void;
}

/** Si aplicar `patch` cambiaría algo del elemento (para no crear pasos de deshacer vacíos). */
function differs<T extends object>(element: T | undefined, patch: Partial<T>): element is T {
  return element !== undefined && Object.entries(patch).some(([key, value]) => JSON.stringify(element[key as keyof T]) !== JSON.stringify(value));
}

/** Marca la fecha de modificación. Se aplica a todo cambio de contenido. */
function touch(diagram: Diagram): Diagram {
  return { ...diagram, updatedAt: new Date().toISOString() };
}

function pushPast(past: Diagram[], diagram: Diagram): Diagram[] {
  return [...past, diagram].slice(-HISTORY_LIMIT);
}

/**
 * Estado global del editor. El historial guarda diagramas completos: como las
 * operaciones nunca mutan, cada versión es una "foto" barata (comparte los nodos
 * que no cambiaron) y deshacer es simplemente volver a la foto anterior.
 */
export const useDiagramStore = create<DiagramState>()((set, get) => {
  /** Aplica una operación pura; con `record` deja la versión previa en el historial. */
  function apply(operation: (diagram: Diagram) => Diagram, record: boolean): void {
    const { diagram, past } = get();
    if (!diagram) return;
    const next = operation(diagram);
    if (next === diagram) return;
    set(
      record
        ? { diagram: touch(next), past: pushPast(past, diagram), future: [] }
        : { diagram: touch(next) },
    );
  }

  function reset(diagram: Diagram) {
    set({
      diagram,
      past: [],
      future: [],
      selection: EMPTY_SELECTION,
      editingNodeId: null,
      editingEdgeId: null,
    });
  }

  return {
    diagram: null,
    past: [],
    future: [],
    selection: EMPTY_SELECTION,
    editingNodeId: null,
    editingEdgeId: null,

    newDiagram: (input) => reset(createEmptyDiagram(input)),
    openDiagram: (diagram) => reset(diagram),
    renameDiagram: (name) => apply((diagram) => ({ ...diagram, name }), false),

    checkpoint: () => {
      const { diagram, past } = get();
      if (diagram) set({ past: pushPast(past, diagram), future: [] });
    },
    moveNodes: (moves) => apply((diagram) => moveNodes(diagram, moves), false),
    resizeNode: (nodeId, size) => apply((diagram) => updateNode(diagram, nodeId, { size }), false),
    reparentNodes: (nodeIds, parentId) =>
      apply((diagram) => nodeIds.reduce((acc, id) => reparentNode(acc, id, parentId), diagram), false),

    setEdgeWaypoints: (edgeId, waypoints) => apply((diagram) => updateEdge(diagram, edgeId, { waypoints }), false),
    setEdgeProps: (edgeId, props) => apply((diagram) => updateEdge(diagram, edgeId, { props }), false),

    addNode: (node) => apply((diagram) => addNode(diagram, node), true),
    connect: (edge) => apply((diagram) => addEdge(diagram, edge), true),
    addElements: (nodes, edges) => {
      if (nodes.length === 0) return;
      // Los contenedores van antes que sus hijos (React Flow lo exige al dibujar).
      apply((diagram) => edges.reduce(addEdge, nodes.reduce(addNode, diagram)), true);
      set({ selection: { nodeIds: nodes.map((node) => node.id), edgeIds: edges.map((edge) => edge.id) } });
    },
    setNodeLabel: (nodeId, label) =>
      apply((diagram) => {
        const node = diagram.nodes.find((candidate) => candidate.id === nodeId);
        return !node || node.label === label ? diagram : updateNode(diagram, nodeId, { label });
      }, true),
    updateNode: (nodeId, patch) =>
      apply((diagram) => {
        const node = diagram.nodes.find((candidate) => candidate.id === nodeId);
        return differs(node, patch) ? updateNode(diagram, nodeId, patch) : diagram;
      }, true),
    setEdgeGuard: (edgeId, guard) =>
      apply((diagram) => {
        const edge = diagram.edges.find((candidate) => candidate.id === edgeId);
        return !edge || edge.guard === guard ? diagram : updateEdge(diagram, edgeId, { guard });
      }, true),
    updateEdge: (edgeId, patch) =>
      apply((diagram) => {
        const edge = diagram.edges.find((candidate) => candidate.id === edgeId);
        return differs(edge, patch) ? updateEdge(diagram, edgeId, patch) : diagram;
      }, true),
    updateNodes: (changes) =>
      apply(
        (diagram) =>
          changes
            .filter(({ id, patch }) => differs(diagram.nodes.find((node) => node.id === id), patch))
            .reduce((current, { id, patch }) => updateNode(current, id, patch), diagram),
        true,
      ),
    updateEdges: (changes) =>
      apply(
        (diagram) =>
          changes
            .filter(({ id, patch }) => differs(diagram.edges.find((edge) => edge.id === id), patch))
            .reduce((current, { id, patch }) => updateEdge(current, id, patch), diagram),
        true,
      ),
    removeElements: (ids) => {
      apply((diagram) => removeElements(diagram, ids), true);
      set({ selection: EMPTY_SELECTION });
    },

    undo: () => {
      const { diagram, past, future } = get();
      const previous = past.at(-1);
      if (!diagram || !previous) return;
      set({ diagram: previous, past: past.slice(0, -1), future: [diagram, ...future], editingNodeId: null, editingEdgeId: null });
    },
    redo: () => {
      const { diagram, past, future } = get();
      const [next, ...rest] = future;
      if (!diagram || !next) return;
      set({ diagram: next, past: pushPast(past, diagram), future: rest, editingNodeId: null, editingEdgeId: null });
    },

    setSelection: (selection) => set({ selection }),
    startEditing: (nodeId) => set({ editingNodeId: nodeId, editingEdgeId: null }),
    startEditingEdge: (edgeId) => set({ editingEdgeId: edgeId, editingNodeId: null }),
  };
});
