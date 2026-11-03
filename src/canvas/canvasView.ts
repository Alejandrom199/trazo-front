import type { Diagram, ElementIds } from '@/core/model';

export interface CanvasPresentation {
  dimmedNodeIds: ReadonlySet<string>;
  dimmedEdgeIds: ReadonlySet<string>;
}

const EMPTY: CanvasPresentation = { dimmedNodeIds: new Set(), dimmedEdgeIds: new Set() };

/**
 * «Enfocar selección»: atenúa lo que no está conectado directamente con lo
 * seleccionado (sus flechas y los nodos al otro extremo siguen a la vista, igual
 * que el contenedor de cada uno y lo que hay dentro de un contenedor elegido).
 * Nunca elimina elementos del modelo ni del lienzo.
 */
export function canvasPresentation(diagram: Diagram, selection: ElementIds, focus: boolean): CanvasPresentation {
  if (!focus || (selection.nodeIds.length === 0 && selection.edgeIds.length === 0)) return EMPTY;

  const nodes = new Set(selection.nodeIds);
  const edges = new Set(selection.edgeIds);
  for (const edge of diagram.edges) {
    if (edges.has(edge.id) || nodes.has(edge.sourceId) || nodes.has(edge.targetId)) {
      edges.add(edge.id);
      nodes.add(edge.sourceId);
      nodes.add(edge.targetId);
    }
  }
  for (const node of diagram.nodes) {
    if (node.parentId && nodes.has(node.id)) nodes.add(node.parentId);
    if (node.parentId && nodes.has(node.parentId)) nodes.add(node.id);
  }

  return {
    dimmedNodeIds: new Set(diagram.nodes.filter((node) => !nodes.has(node.id)).map((node) => node.id)),
    dimmedEdgeIds: new Set(diagram.edges.filter((edge) => !edges.has(edge.id)).map((edge) => edge.id)),
  };
}
