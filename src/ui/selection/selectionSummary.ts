import type { Diagram, DiagramEdge, DiagramNode, ElementIds } from '@/core/model';

/** Elementos seleccionados de un mismo tipo de artefacto. */
export type SelectionGroup =
  | { kind: 'node'; artifactType: string; elements: DiagramNode[] }
  | { kind: 'edge'; artifactType: string; elements: DiagramEdge[] };

export interface SelectionSummary {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  /** Agrupados por tipo, en el orden en que aparecen en el diagrama (nodos primero). */
  groups: SelectionGroup[];
  /** El único grupo, si todo lo seleccionado es del mismo tipo; si no, null. */
  sameType: SelectionGroup | null;
}

/** Qué hay seleccionado, agrupado por tipo de artefacto. */
export function summarizeSelection(diagram: Diagram, selection: ElementIds): SelectionSummary {
  const nodeIds = new Set(selection.nodeIds);
  const edgeIds = new Set(selection.edgeIds);
  const nodes = diagram.nodes.filter((node) => nodeIds.has(node.id));
  const edges = diagram.edges.filter((edge) => edgeIds.has(edge.id));

  const groups: SelectionGroup[] = [
    ...groupBy(nodes).map(([artifactType, elements]) => ({ kind: 'node' as const, artifactType, elements })),
    ...groupBy(edges).map(([artifactType, elements]) => ({ kind: 'edge' as const, artifactType, elements })),
  ];
  return { nodes, edges, groups, sameType: groups.length === 1 ? groups[0]! : null };
}

function groupBy<T extends { artifactType: string }>(elements: T[]): [string, T[]][] {
  const byType = new Map<string, T[]>();
  for (const element of elements) byType.set(element.artifactType, [...(byType.get(element.artifactType) ?? []), element]);
  return [...byType.entries()];
}

/** El valor que comparten todos, o null si difieren (el campo muestra "Varios"). */
export function commonValue<T>(values: T[]): T | null {
  if (values.length === 0) return null;
  const first = JSON.stringify(values[0]);
  return values.every((value) => JSON.stringify(value) === first) ? values[0]! : null;
}
