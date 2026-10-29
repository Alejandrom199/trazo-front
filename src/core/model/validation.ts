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
