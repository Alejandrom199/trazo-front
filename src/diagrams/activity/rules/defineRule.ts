import type { Diagram, ValidationIssue, ValidationRule } from '@/core/model';
import { buildFlowGraph, type FlowGraph } from './flowGraph';

/** Lo que cada regla aporta de un problema concreto; el resto lo completa defineRule. */
export interface IssueDetails {
  message: string;
  suggestion: string;
  nodeIds?: string[];
  edgeIds?: string[];
}

type RuleMeta = Omit<ValidationRule, 'check' | 'diagramType'>;

/**
 * Crea una regla del diagrama de actividades. La regla solo describe qué encontró;
 * id, gravedad y el grafo de flujos los pone este envoltorio, igual para todas.
 * Un diagrama sin nodos de flujo no se valida: no tiene sentido llenar de errores un lienzo vacío.
 */
export function defineRule(meta: RuleMeta, find: (graph: FlowGraph, diagram: Diagram) => IssueDetails[]): ValidationRule {
  return {
    ...meta,
    diagramType: 'activity',
    check: (diagram) => {
      const graph = buildFlowGraph(diagram);
      if (graph.nodes.length === 0) return [];
      return find(graph, diagram).map(
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
