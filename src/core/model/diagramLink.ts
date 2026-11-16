import type { Diagram, DiagramNode } from './diagram';

/**
 * Enlace de un nodo a otro diagrama: el nodo representa un proceso mayor que se
 * detalla en ese diagrama (p. ej. una acción de subproceso). El enlace vive en el
 * propio nodo (en `props`), así viaja con el diagrama al exportarlo o copiarlo.
 */
export const LINKED_DIAGRAM_PROP = 'linkedDiagramId';

/** Id del diagrama enlazado, o null si el nodo no enlaza ninguno. */
export function readLinkedDiagramId(node: Pick<DiagramNode, 'props'>): string | null {
  const value = node.props[LINKED_DIAGRAM_PROP];
  return typeof value === 'string' && value !== '' ? value : null;
}

/** Props del nodo con el enlace cambiado (null lo quita). */
export function withLinkedDiagram(props: Record<string, unknown>, diagramId: string | null): Record<string, unknown> {
  const { [LINKED_DIAGRAM_PROP]: _previous, ...rest } = props;
  return diagramId ? { ...rest, [LINKED_DIAGRAM_PROP]: diagramId } : rest;
}

/** Nodos de `diagrams` que enlazan al diagrama `targetId`, con el diagrama donde están. */
export function callersOf(diagrams: readonly Diagram[], targetId: string): { diagram: Diagram; node: DiagramNode }[] {
  return diagrams.flatMap((diagram) =>
    diagram.id === targetId ? [] : diagram.nodes.filter((node) => readLinkedDiagramId(node) === targetId).map((node) => ({ diagram, node })));
}
