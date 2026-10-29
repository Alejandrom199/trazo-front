import { ActivityArtifact as A } from '../artifactTypes';
import { defineRule } from './defineRule';
import { nodesOfType } from './flowGraph';

/** Regla: toda actividad dice por dónde empieza. */
export const initialMissing = defineRule(
  {
    id: 'activity.initial-missing',
    severity: 'error',
    title: 'Falta el nodo inicial',
    explanation:
      'Sin nodo inicial no se sabe qué paso ocurre primero: el lector no tiene por dónde empezar a recorrer el flujo.',
  },
  (graph) =>
    nodesOfType(graph, A.initialNode).length > 0
      ? []
      : [
          {
            message: 'El diagrama no tiene nodo inicial.',
            suggestion: 'Arrastra un «Nodo inicial» y conéctalo con el primer paso del proceso.',
          },
        ],
);

/** Regla: un único punto de inicio (varios arrancan flujos simultáneos, casi nunca es lo que se quiere). */
export const initialMultiple = defineRule(
  {
    id: 'activity.initial-multiple',
    severity: 'warning',
    title: 'Más de un nodo inicial',
    explanation:
      'UML lo permite, pero cada nodo inicial arranca un flujo a la vez que los demás. Si querías caminos alternativos, eso se modela con una decisión.',
  },
  (graph) => {
    const initials = nodesOfType(graph, A.initialNode);
    if (initials.length <= 1) return [];
    return [
      {
        message: `Hay ${initials.length} nodos iniciales: todos arrancan a la vez.`,
        suggestion: 'Deja un solo nodo inicial y usa una decisión si el proceso empieza de formas distintas.',
        nodeIds: initials.map((node) => node.id),
      },
    ];
  },
);

/** Regla: el proceso tiene un punto donde termina. */
export const finalMissing = defineRule(
  {
    id: 'activity.final-missing',
    severity: 'warning',
    title: 'Falta un nodo final',
    explanation:
      'Sin nodo final no queda claro cuándo termina el proceso. El final de actividad cierra todo; el final de flujo cierra solo una rama.',
  },
  (graph) => {
    const finals = [...nodesOfType(graph, A.activityFinal), ...nodesOfType(graph, A.flowFinal)];
    if (finals.length > 0) return [];
    return [
      {
        message: 'El diagrama no tiene ningún nodo final.',
        suggestion: 'Agrega un «Nodo final de actividad» al terminar el camino principal.',
      },
    ];
  },
);
