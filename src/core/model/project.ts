import type { Diagram } from './diagram';

export const PROJECT_FILE_FORMAT = 'trazo-project';
export const PROJECT_SCHEMA_VERSION = 1;

/** Proyecto activo en la interfaz: agrupa diagramas guardados por su id. */
export interface DiagramProject {
  id: string;
  name: string;
  diagramIds: string[];
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
  createdAt: string;
  updatedAt: string;
}
