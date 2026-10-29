import type { Diagram, DiagramEdge, DiagramNode, ElementIds } from '@/core/model';

/** Qué debe explicar el panel según lo seleccionado. */
export type ExplanationTarget =
  | { kind: 'none' }
  | { kind: 'node'; node: DiagramNode }
  | { kind: 'edge'; edge: DiagramEdge }
  | { kind: 'multiple'; count: number };

/**
 * Traduce la selección a un objetivo. Ignora ids que ya no existen
 * (p. ej. tras deshacer la creación de un nodo que seguía seleccionado).
 */
export function resolveExplanationTarget(diagram: Diagram | null, selection: ElementIds): ExplanationTarget {
  if (!diagram) return { kind: 'none' };

  const nodes = diagram.nodes.filter((node) => selection.nodeIds.includes(node.id));
  const edges = diagram.edges.filter((edge) => selection.edgeIds.includes(edge.id));
  const count = nodes.length + edges.length;

  if (count === 0) return { kind: 'none' };
  if (count > 1) return { kind: 'multiple', count };
  const [node] = nodes;
  if (node) return { kind: 'node', node };
  const [edge] = edges;
  return edge ? { kind: 'edge', edge } : { kind: 'none' };
}

/** Clave estable del objetivo: cambia cuando el usuario selecciona otra cosa. */
export function targetKey(target: ExplanationTarget): string {
  switch (target.kind) {
    case 'none':
      return 'none';
    case 'node':
      return `node:${target.node.id}`;
    case 'edge':
      return `edge:${target.edge.id}`;
    case 'multiple':
      return `multiple:${target.count}`;
  }
}
