import {
  isRequirementKind,
  isRequirementPriority,
  isRequirementStatus,
  isRuleType,
  isTestStatus,
  isTraceRelation,
  requirementDefaults,
  type DiagramProject,
  type DiagramRelation,
  type ProjectFolder,
  type Requirement,
  type RequirementLink,
  type TestCase,
  type WalkChoice,
} from '@/core/model';

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

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

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

/**
 * Lectura tolerante de los requisitos y sus vínculos. Lo ilegible se descarta;
 * un vínculo hacia un diagrama que no es del proyecto, también. Las versiones
 * anteriores (sin requisitos) quedan con listas vacías.
 */
export function parseRequirements(
  raw: Record<string, unknown>,
  diagramIds: readonly string[],
): Pick<DiagramProject, 'requirements' | 'requirementLinks'> {
  const diagrams = new Set(diagramIds);
  const requirements: Requirement[] = (Array.isArray(raw.requirements) ? raw.requirements : [])
    .filter((item): item is Record<string, unknown> => isRecord(item) && typeof item.id === 'string' && typeof item.code === 'string' && typeof item.title === 'string')
    .map((item) => {
      const defaults = requirementDefaults();
      const rule = isRecord(item.rule) ? item.rule : {};
      return {
        ...defaults,
        id: item.id as string,
        code: item.code as string,
        title: item.title as string,
        description: typeof item.description === 'string' ? item.description : '',
        kind: isRequirementKind(item.kind) ? item.kind : 'funcional',
        category: typeof item.category === 'string' ? item.category : '',
        details: strings(item.details),
        priority: isRequirementPriority(item.priority) ? item.priority : 'media',
        status: isRequirementStatus(item.status) ? item.status : 'propuesto',
        version: typeof item.version === 'string' && item.version ? item.version : defaults.version,
        reviewedAt: typeof item.reviewedAt === 'string' ? item.reviewedAt : '',
        rule: {
          type: isRuleType(rule.type) ? rule.type : defaults.rule.type,
          source: typeof rule.source === 'string' ? rule.source : '',
          validFrom: typeof rule.validFrom === 'string' ? rule.validFrom : '',
          validTo: typeof rule.validTo === 'string' ? rule.validTo : '',
          exceptions: strings(rule.exceptions),
          examples: (Array.isArray(rule.examples) ? rule.examples : [])
            .filter((example): example is { given: string; then: string } => isRecord(example) && typeof example.given === 'string' && typeof example.then === 'string')
            .map(({ given, then }) => ({ given, then })),
        },
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date(0).toISOString(),
      };
    });
  const known = new Set(requirements.map((item) => item.id));
  const requirementLinks: RequirementLink[] = (Array.isArray(raw.requirementLinks) ? raw.requirementLinks : [])
    .filter((item): item is Record<string, unknown> => isRecord(item) && typeof item.id === 'string' && typeof item.requirementId === 'string' && typeof item.diagramId === 'string')
    .filter((item) => known.has(item.requirementId as string) && diagrams.has(item.diagramId as string))
    .map((item) => ({
      id: item.id as string,
      requirementId: item.requirementId as string,
      diagramId: item.diagramId as string,
      elementId: typeof item.elementId === 'string' ? item.elementId : null,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date(0).toISOString(),
    }));
  return { requirements, requirementLinks };
}

const isChoice = (value: unknown): value is WalkChoice =>
  isRecord(value) && typeof value.nodeId === 'string' && (typeof value.edgeId === 'string' || typeof value.outcome === 'string' || value.outcome === null);

/**
 * Lectura tolerante de los casos de prueba. Se descartan los ilegibles y los de
 * diagramas que no son del proyecto; de los requisitos, solo quedan los que existen.
 * Las versiones anteriores (sin casos) quedan con la lista vacía.
 */
export function parseTestCases(raw: Record<string, unknown>, diagramIds: readonly string[], requirementIds: readonly string[]): TestCase[] {
  const diagrams = new Set(diagramIds);
  const requirements = new Set(requirementIds);
  return (Array.isArray(raw.testCases) ? raw.testCases : [])
    .filter((item): item is Record<string, unknown> => isRecord(item) && typeof item.id === 'string' && typeof item.code === 'string' && typeof item.diagramId === 'string')
    .filter((item) => diagrams.has(item.diagramId as string))
    .map((item) => ({
      id: item.id as string,
      code: item.code as string,
      title: typeof item.title === 'string' ? item.title : '',
      diagramId: item.diagramId as string,
      choices: (Array.isArray(item.choices) ? item.choices : []).filter(isChoice)
        .map((choice) => ('edgeId' in choice && typeof choice.edgeId === 'string' ? { nodeId: choice.nodeId, edgeId: choice.edgeId } : { nodeId: choice.nodeId, outcome: (choice as { outcome: string | null }).outcome })),
      given: typeof item.given === 'string' ? item.given : '',
      when: typeof item.when === 'string' ? item.when : '',
      then: typeof item.then === 'string' ? item.then : '',
      requirementIds: strings(item.requirementIds).filter((id) => requirements.has(id)),
      status: isTestStatus(item.status) ? item.status : 'pendiente',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date(0).toISOString(),
    }));
}
