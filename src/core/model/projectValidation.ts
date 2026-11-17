import type { Diagram } from './diagram';
import type { TraceEndpoint, TraceLink } from './project';
import type { Requirement, RequirementLink } from './requirements';
import type { Severity } from './validation';

/**
 * Validación ENTRE diagramas de un proyecto. Las reglas de cada diagrama
 * (validation.ts) miran un solo lienzo; estas miran el conjunto: lo que un
 * diagrama afirma y otro debería respaldar.
 */

/** Lo que una regla de proyecto necesita ver: los diagramas cargados y sus vínculos. */
export interface ProjectSnapshot {
  diagrams: readonly Diagram[];
  traceLinks: readonly TraceLink[];
  /** Opcionales: las reglas de requisitos no hacen nada sin ellos. */
  requirements?: readonly Requirement[];
  requirementLinks?: readonly RequirementLink[];
}

/** Las partes del proyecto que un arreglo de un clic puede cambiar. */
export interface ProjectFixableParts {
  traceLinks: readonly TraceLink[];
  requirementLinks: readonly RequirementLink[];
}

/**
 * Corrección de un clic sobre los vínculos del proyecto. Función pura: recibe
 * las partes actuales y devuelve solo las que cambian.
 */
export interface ProjectIssueFix {
  label: string;
  apply: (parts: ProjectFixableParts) => Partial<{ traceLinks: TraceLink[]; requirementLinks: RequirementLink[] }>;
}

/** Un problema concreto entre diagramas; `elements` puede tocar varios diagramas. */
export interface ProjectIssue {
  ruleId: string;
  severity: Severity;
  message: string;
  suggestion: string;
  elements: TraceEndpoint[];
  fix?: ProjectIssueFix;
}

/** Una regla de proyecto. `check` es pura: mismo proyecto ⇒ mismos problemas. */
export interface ProjectRule {
  id: string;
  severity: Severity;
  title: string;
  /** Por qué es un problema para la coherencia del modelo. */
  explanation: string;
  check: (project: ProjectSnapshot) => ProjectIssue[];
}

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/** Ejecuta las reglas y ordena por gravedad, conservando el orden de las reglas dentro de cada una. */
export function validateProject(project: ProjectSnapshot, rules: readonly ProjectRule[]): ProjectIssue[] {
  return rules
    .flatMap((rule) => rule.check(project))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/** Identificador estable de un problema de proyecto. */
export function projectIssueKey(issue: ProjectIssue): string {
  return [issue.ruleId, ...issue.elements.map((element) => `${element.diagramId}:${element.elementId}`)].join('|');
}
