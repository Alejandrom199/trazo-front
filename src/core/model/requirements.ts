import type { Diagram } from './diagram';
import { readLinkedDiagramId } from './diagramLink';

/**
 * Requisitos del proyecto y su trazabilidad: qué se pidió y qué parte del
 * modelo lo cumple. Un requisito se vincula a elementos de los diagramas (o a
 * un diagrama completo); con eso se calcula la cobertura, la matriz requisitos
 * × diagramas y el impacto de un cambio. Todo es puro: datos de entrada, resultado.
 */

export const REQUIREMENT_KINDS = [
  { id: 'funcional', name: 'Funcional', prefix: 'RF' },
  { id: 'no funcional', name: 'No funcional', prefix: 'RNF' },
  { id: 'regla de negocio', name: 'Regla de negocio', prefix: 'RN' },
] as const;
export type RequirementKind = (typeof REQUIREMENT_KINDS)[number]['id'];

export const REQUIREMENT_PRIORITIES = ['alta', 'media', 'baja'] as const;
export type RequirementPriority = (typeof REQUIREMENT_PRIORITIES)[number];

/**
 * propuesto: aún no se acordó. aprobado: hay que cumplirlo. implementado: ya
 * está hecho. descartado: no se hará (no cuenta para la cobertura).
 */
export const REQUIREMENT_STATUSES = ['propuesto', 'aprobado', 'implementado', 'descartado'] as const;
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

export interface Requirement {
  id: string;
  /** Código legible y único en el proyecto: «RF-01», «RN-03». */
  code: string;
  title: string;
  description: string;
  kind: RequirementKind;
  priority: RequirementPriority;
  status: RequirementStatus;
  createdAt: string;
}

/**
 * Qué cumple un requisito: un elemento de un diagrama, o el diagrama completo
 * (`elementId` null), p. ej. «RF-01 lo cumple el proceso «Pedir un préstamo»».
 */
export interface RequirementLink {
  id: string;
  requirementId: string;
  diagramId: string;
  elementId: string | null;
  createdAt: string;
}

export const isRequirementKind = (value: unknown): value is RequirementKind => REQUIREMENT_KINDS.some((kind) => kind.id === value);
export const isRequirementPriority = (value: unknown): value is RequirementPriority => REQUIREMENT_PRIORITIES.includes(value as RequirementPriority);
export const isRequirementStatus = (value: unknown): value is RequirementStatus => REQUIREMENT_STATUSES.includes(value as RequirementStatus);

/** Siguiente código libre para un tipo: RF-01, RF-02… (sin reutilizar los ya usados). */
export function nextRequirementCode(requirements: readonly Pick<Requirement, 'code'>[], kind: RequirementKind): string {
  const prefix = REQUIREMENT_KINDS.find((item) => item.id === kind)!.prefix;
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  const highest = Math.max(0, ...requirements.map((item) => Number(pattern.exec(item.code)?.[1] ?? 0)));
  return `${prefix}-${String(highest + 1).padStart(2, '0')}`;
}

/** ¿El vínculo apunta a algo que existe? (el diagrama, y el elemento si lo nombra). */
export function isLinkAlive(link: Pick<RequirementLink, 'diagramId' | 'elementId'>, diagrams: readonly Diagram[]): boolean {
  const diagram = diagrams.find((candidate) => candidate.id === link.diagramId);
  if (!diagram) return false;
  return link.elementId === null || diagram.nodes.some((node) => node.id === link.elementId) || diagram.edges.some((edge) => edge.id === link.elementId);
}

/** Si el requisito cuenta para la cobertura (los descartados no). */
export const countsForCoverage = (requirement: Pick<Requirement, 'status'>) => requirement.status !== 'descartado';

export interface RequirementCoverage {
  requirement: Requirement;
  /** Vínculos que apuntan a algo que existe. */
  links: RequirementLink[];
  /** Vínculos rotos: el elemento o el diagrama ya no está. */
  broken: RequirementLink[];
  covered: boolean;
}

/** Cobertura de cada requisito, en el orden de la lista. */
export function requirementCoverage(
  requirements: readonly Requirement[],
  links: readonly RequirementLink[],
  diagrams: readonly Diagram[],
): RequirementCoverage[] {
  return requirements.map((requirement) => {
    const own = links.filter((link) => link.requirementId === requirement.id);
    const alive = own.filter((link) => isLinkAlive(link, diagrams));
    return { requirement, links: alive, broken: own.filter((link) => !alive.includes(link)), covered: alive.length > 0 };
  });
}

/** Resumen de cobertura: cuántos de los que cuentan están cubiertos. */
export function coverageSummary(coverage: readonly RequirementCoverage[]): { total: number; covered: number; percent: number } {
  const counting = coverage.filter((item) => countsForCoverage(item.requirement));
  const covered = counting.filter((item) => item.covered).length;
  return { total: counting.length, covered, percent: counting.length === 0 ? 100 : Math.round((covered / counting.length) * 100) };
}

/**
 * Matriz requisitos × diagramas: para cada requisito, cuántos vínculos vivos
 * tiene en cada diagrama (por id de diagrama; 0 si ninguno).
 */
export function requirementMatrix(coverage: readonly RequirementCoverage[]): Map<string, Map<string, number>> {
  return new Map(coverage.map((item) => {
    const row = new Map<string, number>();
    for (const link of item.links) row.set(link.diagramId, (row.get(link.diagramId) ?? 0) + 1);
    return [item.requirement.id, row];
  }));
}

/** Lo que trae el análisis de impacto: qué diagramas y elementos toca un cambio, y qué requisitos. */
export interface ImpactResult {
  diagramIds: Set<string>;
  /** Elementos concretos alcanzados, como «diagrama:elemento». */
  elementKeys: Set<string>;
  requirementIds: Set<string>;
}

/** Lo que el análisis de impacto necesita del proyecto. */
export interface ImpactSources {
  diagrams: readonly Diagram[];
  requirementLinks: readonly RequirementLink[];
  traceLinks: readonly { source: { diagramId: string; elementId: string }; target: { diagramId: string; elementId: string } }[];
  diagramRelations: readonly { sourceDiagramId: string; targetDiagramId: string }[];
}

/**
 * Análisis de impacto: partiendo de un requisito, de un elemento o de un
 * diagrama, sigue en ambos sentidos los vínculos de requisitos, los vínculos
 * entre elementos, las relaciones entre diagramas y los subprocesos (⋔), y
 * devuelve todo lo alcanzado. Responde «si cambio esto, ¿qué más reviso?».
 */
export function impactOf(sources: ImpactSources, start: { requirementId: string } | { diagramId: string; elementId: string | null }): ImpactResult {
  const result: ImpactResult = { diagramIds: new Set(), elementKeys: new Set(), requirementIds: new Set() };
  const expandedDiagrams = new Set<string>();
  type Step = { type: 'requirement'; id: string } | { type: 'diagram'; id: string } | { type: 'element'; diagramId: string; elementId: string };
  const pending: Step[] = [];
  if ('requirementId' in start) pending.push({ type: 'requirement', id: start.requirementId });
  else if (start.elementId) pending.push({ type: 'element', diagramId: start.diagramId, elementId: start.elementId });
  else pending.push({ type: 'diagram', id: start.diagramId });

  while (pending.length > 0) {
    const step = pending.pop()!;
    if (step.type === 'requirement') {
      if (result.requirementIds.has(step.id)) continue;
      result.requirementIds.add(step.id);
      for (const link of sources.requirementLinks.filter((candidate) => candidate.requirementId === step.id)) {
        pending.push(link.elementId ? { type: 'element', diagramId: link.diagramId, elementId: link.elementId } : { type: 'diagram', id: link.diagramId });
      }
    } else if (step.type === 'element') {
      const key = `${step.diagramId}:${step.elementId}`;
      if (result.elementKeys.has(key)) continue;
      result.elementKeys.add(key);
      result.diagramIds.add(step.diagramId);
      for (const link of sources.requirementLinks) {
        if (link.diagramId === step.diagramId && link.elementId === step.elementId) pending.push({ type: 'requirement', id: link.requirementId });
      }
      for (const link of sources.traceLinks) {
        if (link.source.diagramId === step.diagramId && link.source.elementId === step.elementId) pending.push({ type: 'element', ...link.target });
        if (link.target.diagramId === step.diagramId && link.target.elementId === step.elementId) pending.push({ type: 'element', ...link.source });
      }
      // Un subproceso ⋔ arrastra el diagrama que lo detalla.
      const node = sources.diagrams.find((diagram) => diagram.id === step.diagramId)?.nodes.find((candidate) => candidate.id === step.elementId);
      const linked = node ? readLinkedDiagramId(node) : null;
      if (linked) pending.push({ type: 'diagram', id: linked });
    } else {
      // Un diagrama alcanzado como un todo: sus requisitos de diagrama y sus relaciones.
      if (expandedDiagrams.has(step.id)) continue;
      expandedDiagrams.add(step.id);
      result.diagramIds.add(step.id);
      for (const link of sources.requirementLinks) {
        if (link.diagramId === step.id && link.elementId === null) pending.push({ type: 'requirement', id: link.requirementId });
      }
      for (const relation of sources.diagramRelations) {
        if (relation.sourceDiagramId === step.id) pending.push({ type: 'diagram', id: relation.targetDiagramId });
        if (relation.targetDiagramId === step.id) pending.push({ type: 'diagram', id: relation.sourceDiagramId });
      }
    }
  }
  return result;
}
