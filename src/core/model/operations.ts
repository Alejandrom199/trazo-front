import type { Diagram, DiagramEdge, DiagramNode, Position } from './diagram';

/**
 * Operaciones puras sobre un diagrama: reciben uno y devuelven otro nuevo,
 * sin mutar el original. Esa inmutabilidad es la que permite deshacer/rehacer
 * guardando simplemente versiones anteriores.
 */

export interface ElementIds {
  nodeIds: string[];
  edgeIds: string[];
}

export interface NodeMove {
  id: string;
  position: Position;
}

export type NodePatch = Partial<Pick<DiagramNode, 'label' | 'position' | 'size' | 'notes' | 'props' | 'locked'>>;
export type EdgePatch = Partial<Pick<DiagramEdge, 'artifactType' | 'sourceId' | 'targetId' | 'guard' | 'label' | 'routing' | 'waypoints' | 'lineStyle' | 'props'>>;

export function addNode(diagram: Diagram, node: DiagramNode): Diagram {
  return { ...diagram, nodes: [...diagram.nodes, node] };
}

export function addEdge(diagram: Diagram, edge: DiagramEdge): Diagram {
  return { ...diagram, edges: [...diagram.edges, edge] };
}

export function updateNode(diagram: Diagram, nodeId: string, patch: NodePatch): Diagram {
  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
  };
}

export function updateEdge(diagram: Diagram, edgeId: string, patch: EdgePatch): Diagram {
  return {
    ...diagram,
    edges: diagram.edges.map((edge) => (edge.id === edgeId ? { ...edge, ...patch } : edge)),
  };
}

export function moveNodes(diagram: Diagram, moves: NodeMove[]): Diagram {
  const positionById = new Map(moves.map((move) => [move.id, move.position]));
  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => {
      const position = positionById.get(node.id);
      return position ? { ...node, position } : node;
    }),
  };
}

/**
 * Nodos que no se pueden borrar: los bloqueados y los contenedores que tienen
 * algo bloqueado dentro (borrarlos se llevaría ese contenido).
 */
export function protectedNodeIds(diagram: Diagram): Set<string> {
  const protectedIds = new Set<string>();
  for (const node of diagram.nodes) {
    if (!node.locked) continue;
    let current: DiagramNode | undefined = node;
    while (current && !protectedIds.has(current.id)) {
      protectedIds.add(current.id);
      const parentId: string | null = current.parentId;
      current = parentId ? diagram.nodes.find((candidate) => candidate.id === parentId) : undefined;
    }
  }
  return protectedIds;
}

/**
 * Borra nodos y conexiones. Al borrar un contenedor se borra su contenido,
 * y al borrar un nodo se borran las conexiones que lo tocan: nunca quedan
 * hijos huérfanos ni flechas que apunten a la nada. Los nodos protegidos
 * (ver protectedNodeIds) se ignoran aunque se pidan.
 */
export function removeElements(diagram: Diagram, ids: ElementIds): Diagram {
  const protectedIds = protectedNodeIds(diagram);
  const removedNodeIds = collectWithDescendants(
    diagram,
    ids.nodeIds.filter((id) => !protectedIds.has(id)),
  );
  const removedEdgeIds = new Set(ids.edgeIds);

  return {
    ...diagram,
    nodes: diagram.nodes.filter((node) => !removedNodeIds.has(node.id)),
    edges: diagram.edges.filter(
      (edge) =>
        !removedEdgeIds.has(edge.id) &&
        !removedNodeIds.has(edge.sourceId) &&
        !removedNodeIds.has(edge.targetId),
    ),
  };
}

function collectWithDescendants(diagram: Diagram, rootIds: string[]): Set<string> {
  const collected = new Set(rootIds);
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of diagram.nodes) {
      if (node.parentId && collected.has(node.parentId) && !collected.has(node.id)) {
        collected.add(node.id);
        grew = true;
      }
    }
  }
  return collected;
}

/** Posición del nodo en coordenadas del lienzo, sumando las de sus contenedores. */
export function absolutePosition(diagram: Diagram, node: DiagramNode): Position {
  let x = node.position.x;
  let y = node.position.y;
  let parentId = node.parentId;
  while (parentId) {
    const parent = diagram.nodes.find((candidate) => candidate.id === parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }
  return { x, y };
}

/**
 * Mete un nodo en un contenedor (o lo saca, con null) sin que se mueva en pantalla:
 * su posición se recalcula para que sea relativa al nuevo padre.
 */
export function reparentNode(diagram: Diagram, nodeId: string, parentId: string | null): Diagram {
  const node = diagram.nodes.find((candidate) => candidate.id === nodeId);
  if (!node || node.parentId === parentId || nodeId === parentId) return diagram;

  const absolute = absolutePosition(diagram, node);
  const parent = parentId ? diagram.nodes.find((candidate) => candidate.id === parentId) : undefined;
  if (parentId && !parent) return diagram;

  const parentOrigin = parent ? absolutePosition(diagram, parent) : { x: 0, y: 0 };
  return {
    ...diagram,
    nodes: diagram.nodes.map((candidate) =>
      candidate.id === nodeId
        ? {
            ...candidate,
            parentId,
            position: { x: absolute.x - parentOrigin.x, y: absolute.y - parentOrigin.y },
          }
        : candidate,
    ),
  };
}

/**
 * Contenedor que encierra un punto del lienzo. Si hay varios superpuestos gana
 * el último del arreglo, que es el que se dibuja encima.
 */
export function findContainerAt(
  diagram: Diagram,
  point: Position,
  isContainer: (node: DiagramNode) => boolean,
  excludeId?: string,
): DiagramNode | null {
  // Si hay contenedores anidados (un entorno dentro de un servidor), gana el más
  // interno: el más pequeño que contiene el punto. Un contenedor nunca cae dentro
  // de sí mismo ni de lo que lleva dentro.
  let found: DiagramNode | null = null;
  for (const node of diagram.nodes) {
    if (!isContainer(node) || (excludeId && (node.id === excludeId || isInsideOf(diagram, node, excludeId)))) continue;
    const origin = absolutePosition(diagram, node);
    const inside =
      point.x >= origin.x &&
      point.x <= origin.x + node.size.width &&
      point.y >= origin.y &&
      point.y <= origin.y + node.size.height;
    if (inside && (!found || node.size.width * node.size.height < found.size.width * found.size.height)) found = node;
  }
  return found;
}

/** Si `node` está dentro (a cualquier profundidad) del contenedor `ancestorId`. */
export function isInsideOf(diagram: Diagram, node: DiagramNode, ancestorId: string): boolean {
  let parentId = node.parentId;
  while (parentId) {
    if (parentId === ancestorId) return true;
    parentId = diagram.nodes.find((candidate) => candidate.id === parentId)?.parentId ?? null;
  }
  return false;
}

/** Cuántos contenedores hay por encima de un nodo (0 = suelto en el lienzo). */
export function depthOf(diagram: Diagram, node: DiagramNode): number {
  let depth = 0;
  let parentId = node.parentId;
  while (parentId) {
    depth += 1;
    parentId = diagram.nodes.find((candidate) => candidate.id === parentId)?.parentId ?? null;
  }
  return depth;
}
