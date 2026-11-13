import { absolutePosition, horizontalEdgeY, SELF_EDGE_DROP, type Diagram, type DiagramEdge, type DiagramNode, type Position } from '@/core/model';
import type { DiagramModule } from '@/core/registry';
import type { Rect } from './edgeGeometry';
import { buildEdgePath, type EdgePath } from './edgePath';

/**
 * Recorrido de cualquier conexión según cómo la declara su módulo: libre (con
 * trazado y vértices) u horizontal (un mensaje de lado a lado a su altura).
 * Lo usan el lienzo y las miniaturas, para que ambos dibujen lo mismo.
 */
export function connectionPath(diagram: Diagram, module: DiagramModule, edge: DiagramEdge, sourceBox: Rect, targetBox: Rect): EdgePath {
  // Las flechas llegan a la figura visible, no a la caja del nodo (ver NodeKind.edgeInsets).
  const source = visibleRect(module, diagram, edge.sourceId, sourceBox);
  const target = visibleRect(module, diagram, edge.targetId, targetBox);
  if (module.edgeKinds[edge.artifactType]?.layout !== 'horizontal') {
    return buildEdgePath(source, target, edge.routing, edge.waypoints);
  }
  const y = horizontalEdgeY(diagram, edge);
  const isSelf = edge.sourceId === edge.targetId;
  const direction = isSelf ? 1 : Math.sign(centerX(target) - centerX(source)) || 1;
  return buildHorizontalPath(source, target, y, {
    self: isSelf,
    sourceInset: childInset(diagram, edge.sourceId, y, direction),
    // En un mensaje a sí mismo, la vuelta llega al borde de lo que haya a esa altura.
    targetInset: childInset(diagram, edge.targetId, isSelf ? y + SELF_EDGE_DROP : y, -direction),
  });
}

function visibleRect(module: DiagramModule, diagram: Diagram, nodeId: string, box: Rect): Rect {
  const type = diagram.nodes.find((node) => node.id === nodeId)?.artifactType;
  const insets = type ? module.nodeKinds[type]?.edgeInsets : undefined;
  if (!insets) return box;
  const { top = 0, right = 0, bottom = 0, left = 0 } = insets;
  return { x: box.x + left, y: box.y + top, width: box.width - left - right, height: box.height - top - bottom };
}

/** Cuánto sobresale de la vuelta de un mensaje a sí mismo, a la derecha de la línea. */
export const SELF_LOOP_WIDTH = 36;

interface HorizontalOptions {
  self: boolean;
  /** Distancia desde la línea central del origen hasta donde arranca la flecha. */
  sourceInset: number;
  /** Distancia desde la línea central del destino hasta donde llega la punta. */
  targetInset: number;
}

/**
 * Un mensaje horizontal a la altura `y`, de la línea central del origen a la del
 * destino. A sí mismo, sale a la derecha, baja y vuelve. La etiqueta va encima
 * de la línea, en su punto medio.
 */
export function buildHorizontalPath(source: Rect, target: Rect, y: number, options: HorizontalOptions): EdgePath {
  const sourceX = centerX(source);
  if (options.self) {
    const start = sourceX + options.sourceInset;
    const end = sourceX + options.targetInset;
    const loopX = Math.max(start, end) + SELF_LOOP_WIDTH;
    const bottom = y + SELF_EDGE_DROP;
    return {
      d: `M${start},${y} L${loopX},${y} L${loopX},${bottom} L${end},${bottom}`,
      label: { x: (start + loopX) / 2, y },
      controlPoints: [{ x: start, y }, { x: end, y: bottom }],
      sourceHeading: { x: loopX, y },
      legs: [],
    };
  }
  const direction = Math.sign(centerX(target) - sourceX) || 1;
  const start = sourceX + direction * options.sourceInset;
  const end = centerX(target) - direction * options.targetInset;
  return {
    d: `M${start},${y} L${end},${y}`,
    label: { x: (start + end) / 2, y },
    controlPoints: [{ x: start, y }, { x: end, y }],
    sourceHeading: { x: end, y },
    legs: [],
  };
}

const centerX = (rect: Rect) => rect.x + rect.width / 2;

/**
 * Si dentro del nodo hay algo atravesando su línea central a la altura `y` (p. ej.
 * una barra de activación), el mensaje sale o llega a su borde y no a la línea:
 * así la punta de la flecha no queda tapada. `towards` es el lado hacia el que se
 * sale (1 derecha, -1 izquierda).
 */
function childInset(diagram: Diagram, nodeId: string, y: number, towards: number): number {
  const node = diagram.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return 0;
  const lineX = absolutePosition(diagram, node).x + node.size.width / 2;
  return diagram.nodes
    .filter((child) => child.parentId === nodeId)
    .map((child) => ({ child, origin: absolutePosition(diagram, child) }))
    .filter(({ child, origin }) => covers(child, origin, lineX, y))
    .reduce((inset, { child, origin }) => {
      const edge = towards > 0 ? origin.x + child.size.width - lineX : lineX - origin.x;
      return Math.max(inset, edge);
    }, 0);
}

function covers(node: DiagramNode, origin: Position, x: number, y: number): boolean {
  return origin.x <= x && x <= origin.x + node.size.width && origin.y <= y && y <= origin.y + node.size.height;
}
