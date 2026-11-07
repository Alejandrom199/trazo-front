import type { DiagramEdge } from '@/core/model';
import type { DiagramModule } from '@/core/registry';

/**
 * El tipo de la flecha nueva: el elegido en la paleta si es válido entre esos nodos
 * (el deducido o uno al que se puede cambiar), si no, el deducido.
 */
export function chosenEdgeType(module: DiagramModule, resolved: string, preferred: string | null): string {
  if (!preferred || preferred === resolved) return resolved;
  return canSwitchEdgeTo(module, resolved, preferred) ? preferred : resolved;
}

/** Si una conexión del tipo actual puede pasar al tipo pedido (o ya lo es). */
export function canSwitchEdgeTo(module: DiagramModule, fromType: string, toType: string): boolean {
  if (fromType === toType) return true;
  return module.edgeKinds[fromType]?.switchableTo?.includes(toType) ?? false;
}

/** Alternativas de tipo (incluido el actual) conocidas por el catálogo del módulo. */
export function edgeTypeOptions(module: DiagramModule, artifactType: string) {
  const alternatives = module.edgeKinds[artifactType]?.switchableTo ?? [];
  if (alternatives.length === 0) return [];
  return [artifactType, ...alternatives.filter((type) => type !== artifactType)]
    .map((type) => module.artifacts.find((artifact) => artifact.type === type))
    .filter((artifact) => artifact !== undefined);
}

/**
 * Flechas de la selección a las que se les puede aplicar `edgeType`. Vacío si hay
 * nodos seleccionados o alguna flecha no admite ese cambio.
 */
export function switchableSelectedEdges(
  module: DiagramModule,
  edges: DiagramEdge[],
  selectedEdgeIds: string[],
  selectedNodeIds: string[],
  edgeType: string,
): DiagramEdge[] {
  if (selectedNodeIds.length > 0 || selectedEdgeIds.length === 0) return [];
  const selected = edges.filter((edge) => selectedEdgeIds.includes(edge.id));
  if (selected.length === 0) return [];
  return selected.every((edge) => canSwitchEdgeTo(module, edge.artifactType, edgeType)) ? selected : [];
}
