import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { Diagram, DiagramEdge, DiagramNode, ElementIds } from '@/core/model';
import type { DiagramModule } from '@/core/registry';

/**
 * Traducción de nuestro modelo (Diagram) a los objetos que dibuja React Flow.
 * Va en un solo sentido: el store es la fuente de verdad y React Flow solo
 * pinta y avisa de cambios (componente "controlado").
 */

export type ArtifactNodeData = { node: DiagramNode };
export type ArtifactFlowNode = Node<ArtifactNodeData, 'artifact'>;

export type FlowEdgeData = { edge: DiagramEdge };
export type FlowEdge = Edge<FlowEdgeData, 'flow'>;

const EDGE_COLOR = '#3f3f46';
const EDGE_COLOR_SELECTED = '#4f46e5';

export function toFlowNodes(diagram: Diagram, module: DiagramModule, selection: ElementIds): ArtifactFlowNode[] {
  const selected = new Set(selection.nodeIds);
  return [...diagram.nodes]
    .sort((a, b) => drawOrder(a, module) - drawOrder(b, module))
    .map((node) => ({
      id: node.id,
      type: 'artifact',
      className: module.nodeKinds[node.artifactType]?.isContainer ? 'trazo-container' : undefined,
      position: node.position,
      width: node.size.width,
      height: node.size.height,
      parentId: node.parentId ?? undefined,
      selected: selected.has(node.id),
      connectable: module.nodeKinds[node.artifactType]?.connectable ?? false,
      data: { node },
    }));
}

/**
 * React Flow exige que un padre aparezca antes que sus hijos, y lo que va antes
 * se dibuja debajo. Orden: contenedores → nodos sueltos → nodos dentro de contenedores.
 */
function drawOrder(node: DiagramNode, module: DiagramModule): number {
  if (node.parentId) return 2;
  return module.nodeKinds[node.artifactType]?.isContainer ? 0 : 1;
}

export function toFlowEdges(diagram: Diagram, module: DiagramModule, selection: ElementIds): FlowEdge[] {
  const selected = new Set(selection.edgeIds);
  return diagram.edges.map((edge) => {
    const kind = module.edgeKinds[edge.artifactType];
    const isSelected = selected.has(edge.id);
    const color = isSelected ? EDGE_COLOR_SELECTED : EDGE_COLOR;
    return {
      id: edge.id,
      type: 'flow',
      source: edge.sourceId,
      target: edge.targetId,
      selected: isSelected,
      data: { edge },
      markerEnd: kind?.arrow ? { type: MarkerType.ArrowClosed, color, width: 16, height: 16 } : undefined,
      style: { stroke: color, strokeWidth: 1.5, strokeDasharray: kind?.dashed ? '5 4' : undefined },
    };
  });
}
