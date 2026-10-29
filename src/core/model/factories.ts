import { createId } from '@/core/utils/id';
import { CURRENT_SCHEMA_VERSION, type Diagram, type DiagramType } from './diagram';

export interface NewDiagramInput {
  diagramType: DiagramType;
  name: string;
  description?: string;
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
