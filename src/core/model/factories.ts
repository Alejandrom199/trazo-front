import { createId } from '@/core/utils/id';
import { CURRENT_SCHEMA_VERSION, type Diagram, type DiagramType } from './diagram';
import type { Template } from './template';

export interface NewDiagramInput {
  diagramType: DiagramType;
  name: string;
  description?: string;
}

/**
 * Crea un diagrama nuevo a partir de una plantilla. Todos los ids se regeneran
 * (y las referencias padre/origen/destino se traducen) para que dos diagramas
 * creados desde la misma plantilla nunca compartan identificadores.
 */
export function createDiagramFromTemplate(template: Template, now: Date = new Date()): Diagram {
  const newIdByOldId = new Map(template.diagram.nodes.map((node) => [node.id, createId()]));
  const translate = (oldId: string): string => {
    const newId = newIdByOldId.get(oldId);
    if (!newId) throw new Error(`La plantilla "${template.id}" referencia un nodo inexistente: "${oldId}".`);
    return newId;
  };

  return {
    ...createEmptyDiagram(
      { diagramType: template.diagramType, name: template.name, description: template.description },
      now,
    ),
    templateId: template.id,
    nodes: template.diagram.nodes.map((node) => ({
      ...node,
      id: translate(node.id),
      parentId: node.parentId ? translate(node.parentId) : null,
      position: { ...node.position },
      size: { ...node.size },
      props: { ...node.props },
    })),
    edges: template.diagram.edges.map((edge) => ({
      ...edge,
      id: createId(),
      props: { ...edge.props },
      sourceId: translate(edge.sourceId),
      targetId: translate(edge.targetId),
    })),
  };
}

/** Crea un diagrama vacío y válido. `now` es inyectable para pruebas deterministas. */
export function createEmptyDiagram(input: NewDiagramInput, now: Date = new Date()): Diagram {
  const timestamp = now.toISOString();
  return {
    id: createId(),
    name: input.name,
    diagramType: input.diagramType,
    description: input.description ?? '',
    nodes: [],
    edges: [],
    templateId: null,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
