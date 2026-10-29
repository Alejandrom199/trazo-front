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
  // Cambios discretos: cada uno es un paso de deshacer.
  addNode: (node: DiagramNode) => void;
  connect: (edge: DiagramEdge) => void;
  setNodeLabel: (nodeId: string, label: string) => void;
  setEdgeGuard: (edgeId: string, guard: string | null) => void;
  removeElements: (ids: ElementIds) => void;

  undo: () => void;
  redo: () => void;

  setSelection: (selection: ElementIds) => void;
  startEditing: (nodeId: string | null) => void;
  startEditingEdge: (edgeId: string | null) => void;
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

    addNode: (node) => apply((diagram) => addNode(diagram, node), true),
    connect: (edge) => apply((diagram) => addEdge(diagram, edge), true),
    setNodeLabel: (nodeId, label) =>
      apply((diagram) => {
        const node = diagram.nodes.find((candidate) => candidate.id === nodeId);
        return !node || node.label === label ? diagram : updateNode(diagram, nodeId, { label });
      }, true),
    setEdgeGuard: (edgeId, guard) =>
      apply((diagram) => {
        const edge = diagram.edges.find((candidate) => candidate.id === edgeId);
        return !edge || edge.guard === guard ? diagram : updateEdge(diagram, edgeId, { guard });
      }, true),
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
