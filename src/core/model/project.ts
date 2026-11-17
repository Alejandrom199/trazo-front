import type { Diagram } from './diagram';
import type { Requirement, RequirementLink } from './requirements';
import type { TestCase } from './testCases';

export const PROJECT_FILE_FORMAT = 'trazo-project';
/** v3: carpetas y relaciones entre diagramas completos. v4: requisitos y su trazabilidad. */
export const PROJECT_SCHEMA_VERSION = 4;

/** Relaciones de trazabilidad: entre elementos y entre diagramas completos. Única lista. */
export const TRACE_RELATIONS = ['detalla', 'implementa', 'verifica', 'depende de', 'relacionado con'] as const;
export type TraceRelation = (typeof TRACE_RELATIONS)[number];

/** Qué significa cada relación, leída como «A <relación> B». */
export const TRACE_RELATION_HINTS: Record<TraceRelation, string> = {
  detalla: 'explica con más detalle lo que el otro muestra a grandes rasgos',
  implementa: 'lleva a la práctica lo que el otro define',
  verifica: 'comprueba que lo del otro se cumple (por ejemplo, pruebas)',
  'depende de': 'necesita al otro para tener sentido o funcionar',
  'relacionado con': 'tiene que ver con el otro, sin un sentido concreto',
};

/** Verbo con el que se lee la relación en una frase: «A está relacionado con B». */
export const traceRelationVerb = (relation: TraceRelation): string => (relation === 'relacionado con' ? 'está relacionado con' : relation);

export const isTraceRelation = (value: unknown): value is TraceRelation => TRACE_RELATIONS.includes(value as TraceRelation);

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

/** Carpeta de un solo nivel para agrupar diagramas del proyecto. Solo organiza: no cambia vínculos ni reglas. */
export interface ProjectFolder {
  id: string;
  name: string;
}

/**
 * Relación entre dos diagramas completos (no entre sus elementos): «Arquitectura»
 * implementa «Dominio». Sirve para el mapa del proyecto y su seguimiento.
 */
export interface DiagramRelation {
  id: string;
  sourceDiagramId: string;
  targetDiagramId: string;
  relation: TraceRelation;
  createdAt: string;
}

/** Proyecto activo en la interfaz: agrupa diagramas guardados por su id. */
export interface DiagramProject {
  id: string;
  name: string;
  /** Orden de los diagramas; dentro de cada carpeta se respeta este mismo orden. */
  diagramIds: string[];
  traceLinks: TraceLink[];
  /** Carpetas, en su orden. */
  folders: ProjectFolder[];
  /** Carpeta de cada diagrama (por id); el que no aparece está sin carpeta. */
  folderOf: Record<string, string>;
  diagramRelations: DiagramRelation[];
  /** Requisitos del proyecto (RF, RNF, RN) y lo que los cumple. */
  requirements: Requirement[];
  requirementLinks: RequirementLink[];
  /** Casos de prueba: caminos de los procesos con lo que debe pasar, y los requisitos que verifican. */
  testCases: TestCase[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Orden de los diagramas del proyecto con `diagramId` movido a la posición `toIndex`
 * (se acota a la lista). Si el diagrama no está en el proyecto, el orden no cambia.
 */
export function moveDiagramInOrder(diagramIds: readonly string[], diagramId: string, toIndex: number): string[] {
  const from = diagramIds.indexOf(diagramId);
  if (from === -1) return [...diagramIds];
  const rest = diagramIds.filter((id) => id !== diagramId);
  const to = Math.max(0, Math.min(rest.length, toIndex));
  return [...rest.slice(0, to), diagramId, ...rest.slice(to)];
}

type ProjectContents = Pick<DiagramProject, 'diagramIds' | 'traceLinks' | 'folderOf' | 'diagramRelations' | 'requirementLinks' | 'testCases'>;

/**
 * Lo que queda en el proyecto al quitarle los diagramas `removed`: se van con
 * ellos los vínculos y relaciones que los tocan y su lugar en las carpetas (las
 * carpetas se conservan, aunque queden vacías). null si no hay nada que quitar.
 */
export function withoutDiagrams(project: ProjectContents, removed: ReadonlySet<string>): ProjectContents | null {
  if (!project.diagramIds.some((id) => removed.has(id))) return null;
  return {
    diagramIds: project.diagramIds.filter((id) => !removed.has(id)),
    traceLinks: project.traceLinks.filter((link) => !removed.has(link.source.diagramId) && !removed.has(link.target.diagramId)),
    folderOf: Object.fromEntries(Object.entries(project.folderOf).filter(([id]) => !removed.has(id))),
    diagramRelations: project.diagramRelations.filter((relation) => !removed.has(relation.sourceDiagramId) && !removed.has(relation.targetDiagramId)),
    requirementLinks: project.requirementLinks.filter((link) => !removed.has(link.diagramId)),
    testCases: project.testCases.filter((item) => !removed.has(item.diagramId)),
  };
}

/** Un grupo de la barra lateral: una carpeta (o null, los diagramas sin carpeta) con sus diagramas en orden. */
export interface FolderGroup {
  folder: ProjectFolder | null;
  diagramIds: string[];
}

/**
 * Diagramas agrupados por carpeta: primero los que no tienen carpeta y después
 * cada carpeta en su orden (también las vacías). Dentro de cada grupo se respeta
 * el orden del proyecto. Una carpeta que ya no existe cuenta como sin carpeta.
 */
export function groupByFolder(project: Pick<DiagramProject, 'diagramIds' | 'folders' | 'folderOf'>): FolderGroup[] {
  const known = new Set(project.folders.map((folder) => folder.id));
  const folderIdOf = (id: string) => (known.has(project.folderOf[id] ?? '') ? project.folderOf[id]! : null);
  return [
    { folder: null, diagramIds: project.diagramIds.filter((id) => folderIdOf(id) === null) },
    ...project.folders.map((folder) => ({ folder, diagramIds: project.diagramIds.filter((id) => folderIdOf(id) === folder.id) })),
  ];
}

/** Contenido autocontenido que viaja en un archivo .trazo-project. */
export interface DiagramProjectFile {
  format: typeof PROJECT_FILE_FORMAT;
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  id: string;
  name: string;
  diagrams: Diagram[];
  traceLinks: TraceLink[];
  folders: ProjectFolder[];
  folderOf: Record<string, string>;
  diagramRelations: DiagramRelation[];
  requirements: Requirement[];
  requirementLinks: RequirementLink[];
  testCases: TestCase[];
  createdAt: string;
  updatedAt: string;
}
