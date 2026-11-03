import type { Diagram, DiagramEdge, DiagramNode, DiagramType, Position } from './diagram';
import type { ElementIds } from './operations';

/**
 * Copiar y pegar dentro de Trazo. Lo copiado es una foto independiente del
 * diagrama: los nodos elegidos (un contenedor arrastra a todo lo que tiene dentro)
 * y solo las flechas cuyos dos extremos van en la copia; una flecha suelta no
 * tendría a quién unirse al pegar.
 */
export interface Clipboard {
  diagramType: DiagramType;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export function copySelection(diagram: Diagram, selection: ElementIds): Clipboard | null {
  const ids = new Set(selection.nodeIds);
  // Un contenedor copia también su contenido, a cualquier profundidad.
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of diagram.nodes) {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        grew = true;
      }
    }
  }
  const nodes = diagram.nodes.filter((node) => ids.has(node.id));
  if (nodes.length === 0) return null;
  const edges = diagram.edges.filter((edge) => ids.has(edge.sourceId) && ids.has(edge.targetId));
  return { diagramType: diagram.diagramType, nodes: structuredClone(nodes), edges: structuredClone(edges) };
}

export interface PasteOptions {
  /** Cuánto se corre lo pegado respecto del original, para que se vea que hay una copia. */
  offset: Position;
  createId: () => string;
  /** Si un nodo no debe correrse en vertical (p. ej. participantes que comparten fila). */
  keepsRow?: (node: DiagramNode) => boolean;
}

/**
 * Prepara lo copiado para agregarlo al diagrama: ids nuevos (con las referencias
 * entre nodos y flechas traducidas) y corrido para que no tape al original.
 * Un nodo cuyo contenedor también se pegó queda dentro de la copia del
 * contenedor; si su contenedor no vino en la copia pero sigue en el diagrama,
 * vuelve a ese contenedor; si no existe, queda suelto. Todo se pega desbloqueado.
 */
export function pasteClipboard(diagram: Diagram, clipboard: Clipboard, options: PasteOptions): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const newIds = new Map(clipboard.nodes.map((node) => [node.id, options.createId()]));
  const existing = new Set(diagram.nodes.map((node) => node.id));

  const nodes = clipboard.nodes.map((node): DiagramNode => {
    const copiedParent = node.parentId ? newIds.get(node.parentId) : undefined;
    const parentId = copiedParent ?? (node.parentId && existing.has(node.parentId) ? node.parentId : null);
    // Dentro de un contenedor copiado, la posición relativa no cambia: ya se corre el contenedor.
    const shift = copiedParent ? { x: 0, y: 0 } : { x: options.offset.x, y: options.keepsRow?.(node) ? 0 : options.offset.y };
    return {
      ...structuredClone(node),
      id: newIds.get(node.id)!,
      parentId,
      position: { x: node.position.x + shift.x, y: node.position.y + shift.y },
      locked: false,
    };
  });

  const edges = clipboard.edges.map(
    (edge): DiagramEdge => ({
      ...structuredClone(edge),
      id: options.createId(),
      sourceId: newIds.get(edge.sourceId)!,
      targetId: newIds.get(edge.targetId)!,
      waypoints: edge.waypoints.map((point) => ({ x: point.x + options.offset.x, y: point.y + options.offset.y })),
    }),
  );
  return { nodes, edges };
}
