import type { Diagram, DiagramType } from './diagram';

export type Severity = 'error' | 'warning' | 'info';

/** Un problema concreto encontrado en un diagrama. */
export interface ValidationIssue {
  ruleId: string;
  severity: Severity;
  message: string;
  nodeIds: string[];
  edgeIds: string[];
  suggestion: string;
  /** Corrección de un clic, si la regla sabe aplicarla (ver fixes.ts). */
  fix?: IssueFix;
}

/**
 * Corrección automática de un problema: una función pura que devuelve el
 * diagrama corregido. `createId` da los ids de lo que agregue.
 */
export interface IssueFix {
  /** Qué hace, en pocas palabras: «Agregar el estado inicial». */
  label: string;
  apply: (diagram: Diagram, createId: () => string) => Diagram;
}

/**
 * Una regla de validación. `check` debe ser una función pura:
 * mismo diagrama ⇒ mismos problemas, sin efectos secundarios.
 */
export interface ValidationRule {
  id: string;
  diagramType: DiagramType;
  severity: Severity;
  title: string;
  /** Por qué es un problema según UML. */
  explanation: string;
  check: (diagram: Diagram) => ValidationIssue[];
}

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/**
 * Ejecuta todas las reglas y devuelve los problemas ordenados por gravedad
 * (errores primero). Conserva el orden de las reglas dentro de cada gravedad.
 */
export function validateDiagram(diagram: Diagram, rules: ValidationRule[]): ValidationIssue[] {
  return rules
    .flatMap((rule) => rule.check(diagram))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/** Identificador estable de un problema, para saber si sigue existiendo tras un cambio. */
export function issueKey(issue: ValidationIssue): string {
  return [issue.ruleId, ...issue.nodeIds, ...issue.edgeIds].join('|');
}
