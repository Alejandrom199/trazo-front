import { isTraceRelation, type DiagramProject, type DiagramRelation, type ProjectFolder } from '@/core/model';

/**
 * Lectura tolerante de la organización de un proyecto (carpetas y relaciones
 * entre diagramas), común al guardado del navegador y al archivo .trazo-project.
 * Lo ilegible se descarta en lugar de impedir abrir el proyecto; las versiones
 * anteriores, que no tenían estos campos, quedan sin carpetas ni relaciones.
 * `diagramIds`: los diagramas del proyecto; lo que apunta a otros se descarta.
 */
export function parseOrganization(
  raw: Record<string, unknown>,
  diagramIds: readonly string[],
): Pick<DiagramProject, 'folders' | 'folderOf' | 'diagramRelations'> {
  const diagrams = new Set(diagramIds);
  const folders = (Array.isArray(raw.folders) ? raw.folders : []).filter(isFolder).map(({ id, name }) => ({ id, name }));
  const folderIds = new Set(folders.map((folder) => folder.id));
  const folderOf = isRecord(raw.folderOf)
    ? Object.fromEntries(
        Object.entries(raw.folderOf).filter((entry): entry is [string, string] => diagrams.has(entry[0]) && typeof entry[1] === 'string' && folderIds.has(entry[1])),
      )
    : {};
  const diagramRelations = (Array.isArray(raw.diagramRelations) ? raw.diagramRelations : [])
    .filter(isDiagramRelation)
    .filter((relation) => diagrams.has(relation.sourceDiagramId) && diagrams.has(relation.targetDiagramId))
    .map(({ id, sourceDiagramId, targetDiagramId, relation, createdAt }) => ({ id, sourceDiagramId, targetDiagramId, relation, createdAt }));
  return { folders, folderOf, diagramRelations };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFolder(value: unknown): value is ProjectFolder {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string';
}

function isDiagramRelation(value: unknown): value is DiagramRelation {
  return isRecord(value) && typeof value.id === 'string' && typeof value.sourceDiagramId === 'string' && typeof value.targetDiagramId === 'string'
    && value.sourceDiagramId !== value.targetDiagramId && isTraceRelation(value.relation) && typeof value.createdAt === 'string';
}
