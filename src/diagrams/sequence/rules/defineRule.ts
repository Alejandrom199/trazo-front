import type { Diagram, ValidationIssue, ValidationRule } from '@/core/model';
import { buildSequenceModel, type SequenceModel } from '../sequenceModel';

/** Lo que cada regla aporta de un problema concreto; el resto lo completa defineRule. */
export interface IssueDetails {
  message: string;
  suggestion: string;
  nodeIds?: string[];
  edgeIds?: string[];
}

type RuleMeta = Omit<ValidationRule, 'check' | 'diagramType'>;

/**
 * Crea una regla del diagrama de secuencia. La regla solo describe qué encontró;
 * id, gravedad y el modelo temporal los pone este envoltorio, igual para todas.
 * Un diagrama sin participantes no se valida: no tiene sentido llenar de errores un lienzo vacío.
 */
export function defineRule(meta: RuleMeta, find: (model: SequenceModel, diagram: Diagram) => IssueDetails[]): ValidationRule {
  return {
    ...meta,
    diagramType: 'sequence',
    check: (diagram) => {
      const model = buildSequenceModel(diagram);
      if (model.participants.length === 0) return [];
      return find(model, diagram).map(
        (details): ValidationIssue => ({
          ruleId: meta.id,
          severity: meta.severity,
          nodeIds: [],
          edgeIds: [],
          ...details,
        }),
      );
    },
  };
}
