import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { containerJoints, protectedNodeIds, type ContainerJoints, type Diagram, type DiagramEdge, type DiagramNode, type ElementIds } from '@/core/model';
import type { ArrowHead, DiagramModule } from '@/core/registry';
import { dashArrayFor } from './edgePath';
import type { CanvasPresentation } from './canvasView';

/**
 * Traducción de nuestro modelo (Diagram) a los objetos que dibuja React Flow.
 * Va en un solo sentido: el store es la fuente de verdad y React Flow solo
 * pinta y avisa de cambios (componente "controlado").
 */

export type ArtifactNodeData = { node: DiagramNode; joints?: ContainerJoints };
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

const ARROW_MARKERS: Record<ArrowHead, MarkerType> = { filled: MarkerType.ArrowClosed, open: MarkerType.Arrow };

export function toFlowNodes(
  diagram: Diagram,
  module: DiagramModule,
  selection: ElementIds,
  highlight: CanvasHighlight = NO_HIGHLIGHT,
  presentation?: CanvasPresentation,
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
        (module.nodeKinds[node.artifactType]?.isContainer || module.nodeKinds[node.artifactType]?.gripOnly) && 'trazo-container',
        highlight.ids.has(node.id) && highlight.className,
        presentation?.dimmedNodeIds.has(node.id) && 'trazo-dimmed',
        module.nodeKinds[node.artifactType]?.secondaryDetail && 'trazo-secondary-detail',
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
      data: { node, joints: isContainer(node) ? containerJoints(diagram, node, isContainer) : undefined },
    }));
}

/**
 * React Flow exige que un padre aparezca antes que sus hijos, y lo que va antes
 * se dibuja debajo. Orden: capa de fondo (marcos) → contenedores → nodos sueltos
 * → nodos dentro de contenedores.
 */
export function drawOrder(node: DiagramNode, module: DiagramModule): number {
  if (node.parentId) return 3;
  const kind = module.nodeKinds[node.artifactType];
  if (kind?.layer === 'back') return 0;
  return kind?.isContainer ? 1 : 2;
}

export function toFlowEdges(
  diagram: Diagram,
  module: DiagramModule,
  selection: ElementIds,
  highlight: CanvasHighlight = NO_HIGHLIGHT,
  presentation?: CanvasPresentation,
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
      className: classNames(highlight.ids.has(edge.id) && highlight.className, presentation?.dimmedEdgeIds.has(edge.id) && 'trazo-dimmed', kind?.secondaryDetail && 'trazo-secondary-detail'),
      data: { edge },
      markerEnd: kind?.arrow ? { type: ARROW_MARKERS[kind.arrow], color, width: 16, height: 16 } : undefined,
      markerStart: kind?.sourceMarker ? `url(#trazo-${kind.sourceMarker})` : undefined,
      style: {
        stroke: color,
        strokeWidth: 1.5,
        // Estilo elegido por el usuario; si no eligió, el de su tipo de conexión.
        strokeDasharray: edge.lineStyle ? dashArrayFor(edge.lineStyle) : kind?.dashed ? dashArrayFor('dashed') : undefined,
        strokeLinecap: edge.lineStyle === 'dotted' ? 'round' : undefined,
      },
    };
  });
}
