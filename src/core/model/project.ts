import type { Diagram } from './diagram';

export const PROJECT_FILE_FORMAT = 'trazo-project';
export const PROJECT_SCHEMA_VERSION = 2;

export type TraceRelation = 'detalla' | 'implementa' | 'verifica' | 'depende de' | 'relacionado con';

export interface TraceEndpoint {
  diagramId: string;
  elementId: string;
  kind: 'node' | 'edge';
}

/** Relación explícita entre elementos de dos diagramas del mismo proyecto. */
export interface TraceLink {
  id: string;
  source: TraceEndpoint;
  target: TraceEndpoint;
  relation: TraceRelation;
  createdAt: string;
}

/** Proyecto activo en la interfaz: agrupa diagramas guardados por su id. */
export interface DiagramProject {
  id: string;
  name: string;
  diagramIds: string[];
  traceLinks: TraceLink[];
  createdAt: string;
  updatedAt: string;
}

/** Contenido autocontenido que viaja en un archivo .trazo-project. */
export interface DiagramProjectFile {
  format: typeof PROJECT_FILE_FORMAT;
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  id: string;
  name: string;
  diagrams: Diagram[];
  traceLinks: TraceLink[];
  createdAt: string;
  updatedAt: string;
}
