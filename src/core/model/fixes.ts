import { DEFAULT_EDGE_SHAPE, type Diagram, type DiagramNode, type Size } from './diagram';
import { absolutePosition, addEdge, addNode, updateEdge } from './operations';

/**
 * Piezas para escribir correcciones de un clic (IssueFix). Todas son puras:
 * reciben un diagrama y devuelven otro. Las reglas de cada módulo las combinan
 * con sus propios tipos de artefacto.
 */

/** Separación con la que se coloca un elemento nuevo junto a otro. */
export const FIX_GAP = 80;

const center = (diagram: Diagram, node: DiagramNode) => {
  const { x, y } = absolutePosition(diagram, node);
  return { x: x + node.size.width / 2, y: y + node.size.height / 2 };
};

/** El nodo más cercano a `origin` (por la distancia entre centros) que cumple `accept`. */
export function nearestNode(diagram: Diagram, origin: DiagramNode, accept: (node: DiagramNode) => boolean): DiagramNode | undefined {
  const from = center(diagram, origin);
  return diagram.nodes
    .filter((node) => node.id !== origin.id && accept(node))
    .map((node) => ({ node, distance: Math.hypot(center(diagram, node).x - from.x, center(diagram, node).y - from.y) }))
    .sort((a, b) => a.distance - b.distance)[0]?.node;
}

/** Une dos nodos con una conexión del tipo dado (con la forma por defecto). */
export function connectNodes(diagram: Diagram, sourceId: string, targetId: string, edgeType: string, createId: () => string, label = ''): Diagram {
  return addEdge(diagram, { id: createId(), artifactType: edgeType, sourceId, targetId, label, guard: null, ...DEFAULT_EDGE_SHAPE, waypoints: [], props: {} });
}

/** Cambia el texto de varias conexiones a la vez. */
export function relabelEdges(diagram: Diagram, labels: Map<string, string>): Diagram {
  return [...labels].reduce((current, [edgeId, label]) => updateEdge(current, edgeId, { label }), diagram);
}

/**
 * Agrega un nodo junto a otro, en su mismo contenedor: a la izquierda o a la
 * derecha, centrado en altura. Devuelve el diagrama y el id del nodo nuevo.
 */
export function addNodeBeside(
  diagram: Diagram,
  near: DiagramNode,
  side: 'left' | 'right',
  node: { artifactType: string; size: Size; label?: string; props?: Record<string, unknown> },
  createId: () => string,
): { diagram: Diagram; id: string } {
  const id = createId();
  const x = side === 'left' ? near.position.x - FIX_GAP - node.size.width : near.position.x + near.size.width + FIX_GAP;
  const y = near.position.y + (near.size.height - node.size.height) / 2;
  return {
    id,
    diagram: addNode(diagram, {
      id,
      artifactType: node.artifactType,
      label: node.label ?? '',
      position: { x, y },
      size: { ...node.size },
      parentId: near.parentId,
      props: { ...node.props },
      notes: '',
      locked: false,
    }),
  };
}

/**
 * Corrección común a todos los diagramas: anclar una nota suelta al elemento más
 * cercano (que no sea otra nota) con el conector de anclaje del módulo.
 */
export function anchorNoteFix(noteId: string, noteType: string, linkType: string) {
  return {
    label: 'Anclarla al elemento más cercano',
    apply: (diagram: Diagram, createId: () => string): Diagram => {
      const note = diagram.nodes.find((node) => node.id === noteId);
      const target = note && nearestNode(diagram, note, (node) => node.artifactType !== noteType);
      return note && target ? connectNodes(diagram, note.id, target.id, linkType, createId) : diagram;
    },
  };
}
