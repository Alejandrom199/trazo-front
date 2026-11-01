import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { joinedSides, protectedNodeIds, type Diagram, type DiagramEdge, type DiagramNode, type ElementIds, type JoinedSides } from '@/core/model';
import type { DiagramModule } from '@/core/registry';

/**
 * Traducción de nuestro modelo (Diagram) a los objetos que dibuja React Flow.
 * Va en un solo sentido: el store es la fuente de verdad y React Flow solo
 * pinta y avisa de cambios (componente "controlado").
 */

export type ArtifactNodeData = { node: DiagramNode; joinedSides?: JoinedSides };
export type ArtifactFlowNode = Node<ArtifactNodeData, 'artifact'>;

export type FlowEdgeData = { edge: DiagramEdge };
export type FlowEdge = Edge<FlowEdgeData, 'flow'>;

/** Elementos a resaltar y con qué clase CSS (según la gravedad del problema). */
export interface CanvasHighlight {
  ids: ReadonlySet<string>;
  className: string;
}

const NO_HIGHLIGHT: CanvasHighlight = { ids: new Set(), className: '' };

function classNames(...names: (string | false | undefined)[]): string | undefined {
  const joined = names.filter(Boolean).join(' ');
  return joined || undefined;
}

/** Variables CSS del tema: las flechas cambian solas entre claro y oscuro. */
const EDGE_COLOR = 'var(--color-edge)';
const EDGE_COLOR_SELECTED = 'var(--color-accent)';

export function toFlowNodes(
  diagram: Diagram,
  module: DiagramModule,
  selection: ElementIds,
  highlight: CanvasHighlight = NO_HIGHLIGHT,
): ArtifactFlowNode[] {
  const selected = new Set(selection.nodeIds);
  const undeletable = protectedNodeIds(diagram);
  const isContainer = (node: DiagramNode) => module.nodeKinds[node.artifactType]?.isContainer ?? false;
  return [...diagram.nodes]
    .sort((a, b) => drawOrder(a, module) - drawOrder(b, module))
    .map((node) => ({
      id: node.id,
      type: 'artifact',
      className: classNames(
        module.nodeKinds[node.artifactType]?.isContainer && 'trazo-container',
        highlight.ids.has(node.id) && highlight.className,
      ),
      position: node.position,
      width: node.size.width,
      height: node.size.height,
      parentId: node.parentId ?? undefined,
      selected: selected.has(node.id),
      connectable: module.nodeKinds[node.artifactType]?.connectable ?? false,
      // Bloqueado: React Flow no lo deja arrastrar; ni a él ni a su carril, borrar con Supr.
      draggable: !node.locked,
      deletable: !undeletable.has(node.id),
      data: { node, joinedSides: isContainer(node) ? joinedSides(diagram, node, isContainer) : undefined },
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

export function toFlowEdges(
  diagram: Diagram,
  module: DiagramModule,
  selection: ElementIds,
  highlight: CanvasHighlight = NO_HIGHLIGHT,
): FlowEdge[] {
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
      className: classNames(highlight.ids.has(edge.id) && highlight.className),
      data: { edge },
      markerEnd: kind?.arrow ? { type: MarkerType.ArrowClosed, color, width: 16, height: 16 } : undefined,
      style: { stroke: color, strokeWidth: 1.5, strokeDasharray: kind?.dashed ? '5 4' : undefined },
    };
  });
}
