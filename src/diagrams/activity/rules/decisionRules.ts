import { updateEdge, type Diagram } from '@/core/model';
import { ActivityArtifact as A } from '../artifactTypes';
import { defineRule } from './defineRule';
import { nodesOfType, outgoingOf } from './flowGraph';

/** Regla: una decisión ofrece al menos dos caminos. */
export const decisionOutgoing = defineRule(
  {
    id: 'activity.decision-outgoing',
    severity: 'error',
    title: 'Decisión con menos de dos salidas',
    explanation: 'Una decisión elige entre caminos. Con una sola salida no hay nada que decidir.',
  },
  (graph) =>
    nodesOfType(graph, A.decision)
      .filter((decision) => outgoingOf(graph, decision.id).length < 2)
      .map((decision) => ({
        message: `Una decisión tiene ${outgoingOf(graph, decision.id).length} salida(s); necesita al menos 2.`,
        suggestion: 'Agrega la salida alternativa con su guarda (puede ser [else]), o quita la decisión.',
        nodeIds: [decision.id],
      })),
);

/** Regla: cada salida de una decisión dice cuándo se toma. */
export const decisionGuardMissing = defineRule(
  {
    id: 'activity.decision-guard-missing',
    severity: 'warning',
    title: 'Salida de decisión sin guarda',
    explanation:
      'Sin guarda no se sabe cuándo se toma ese camino. UML lo permite, pero entonces la elección es arbitraria.',
  },
  (graph) =>
    nodesOfType(graph, A.decision).flatMap((decision) => {
      const unguarded = outgoingOf(graph, decision.id).filter((edge) => !edge.guard?.trim());
      if (unguarded.length === 0) return [];
      return [
        {
          message: `Una decisión tiene ${unguarded.length} salida(s) sin guarda.`,
          suggestion: 'Haz doble clic sobre cada flecha y escribe su condición, p. ej. [pago aprobado] y [else].',
          nodeIds: [decision.id],
          edgeIds: unguarded.map((edge) => edge.id),
          fix: {
            label: 'Poner guardas en sus salidas',
            // La última sin guarda queda como [else]; las demás, con una condición por escribir.
            apply: (diagram: Diagram) =>
              unguarded.reduce((current, edge, index) => updateEdge(current, edge.id, { guard: index === unguarded.length - 1 ? 'else' : 'condición' }), diagram),
          },
        },
      ];
    }),
);

/** Normaliza una guarda para compararla: "[ Pago  OK ]" y "pago ok" son la misma condición. */
export function normalizeGuard(guard: string): string {
  return guard.replace(/^\[|\]$/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Regla: las guardas de una decisión no se repiten (deben ser mutuamente excluyentes). */
export const decisionGuardDuplicate = defineRule(
  {
    id: 'activity.decision-guard-duplicate',
    severity: 'error',
    title: 'Guardas repetidas',
    explanation:
      'Las guardas de una decisión deben excluirse entre sí. Si dos son iguales, el flujo no sabe cuál tomar.',
  },
  (graph) =>
    nodesOfType(graph, A.decision).flatMap((decision) => {
      const edgesByGuard = new Map<string, string[]>();
      for (const edge of outgoingOf(graph, decision.id)) {
        if (!edge.guard?.trim()) continue;
        const key = normalizeGuard(edge.guard);
        edgesByGuard.set(key, [...(edgesByGuard.get(key) ?? []), edge.id]);
      }
      return [...edgesByGuard.entries()]
        .filter(([, edgeIds]) => edgeIds.length > 1)
        .map(([guard, edgeIds]) => ({
          message: `La guarda [${guard}] aparece ${edgeIds.length} veces en la misma decisión.`,
          suggestion: 'Cambia una de ellas para que las condiciones no se solapen.',
          nodeIds: [decision.id],
          edgeIds,
        }));
    }),
);
