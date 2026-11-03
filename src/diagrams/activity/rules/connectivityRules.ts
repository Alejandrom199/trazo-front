import { anchorNoteFix } from '@/core/model';
import { ActivityArtifact as A } from '../artifactTypes';
import { defineRule } from './defineRule';
import { describeNode, incomingOf, outgoingOf, reachableFrom, startNodeIds } from './flowGraph';

/** Regla: ningún nodo de flujo queda suelto. */
export const nodeIsolated = defineRule(
  {
    id: 'activity.node-isolated',
    severity: 'warning',
    title: 'Nodo sin conexiones',
    explanation:
      'Un nodo sin flechas no forma parte del proceso: nunca recibe el turno ni lo pasa a nadie.',
  },
  (graph) =>
    graph.nodes
      .filter((node) => incomingOf(graph, node.id).length === 0 && outgoingOf(graph, node.id).length === 0)
      .map((node) => ({
        message: `${describeNode(node, 'Un nodo')} no está conectado con nada.`,
        suggestion: 'Conéctalo con el paso anterior y el siguiente, o bórralo si sobra.',
        nodeIds: [node.id],
      })),
);

/**
 * Regla: todo nodo conectado se puede alcanzar desde un punto de inicio.
 * Los nodos sueltos ya los reporta nodeIsolated; aquí solo los que están
 * conectados entre sí pero en una "isla" a la que el flujo nunca llega.
 */
export const nodeUnreachable = defineRule(
  {
    id: 'activity.node-unreachable',
    severity: 'warning',
    title: 'Nodo inalcanzable',
    explanation:
      'Siguiendo las flechas desde el inicio nunca se llega a este nodo, así que jamás se ejecuta. Suele indicar una flecha al revés o que falta una conexión.',
  },
  (graph) => {
    const starts = startNodeIds(graph);
    if (starts.length === 0) return [];
    const reachable = reachableFrom(graph, starts);
    return graph.nodes
      .filter((node) => !reachable.has(node.id))
      .filter((node) => incomingOf(graph, node.id).length + outgoingOf(graph, node.id).length > 0)
      .map((node) => ({
        message: `${describeNode(node, 'Un nodo')} no se alcanza desde el inicio.`,
        suggestion: 'Revisa el sentido de las flechas o conéctalo con un paso que sí se ejecute.',
        nodeIds: [node.id],
      }));
  },
);

/** Regla: una nota dice a qué se refiere. */
export const noteUnanchored = defineRule(
  {
    id: 'activity.note-unanchored',
    severity: 'info',
    title: 'Nota sin anclar',
    explanation: 'Una nota suelta es ambigua. Anclarla a un elemento deja claro qué explica.',
  },
  (_graph, diagram) => {
    const anchored = new Set(
      diagram.edges
        .filter((edge) => edge.artifactType === A.annotationLink)
        .flatMap((edge) => [edge.sourceId, edge.targetId]),
    );
    return diagram.nodes
      .filter((node) => node.artifactType === A.note && !anchored.has(node.id))
      .map((node) => ({
        message: 'Hay una nota que no está anclada a ningún elemento.',
        suggestion: 'Arrastra desde un punto de la nota hasta el elemento que comenta.',
        nodeIds: [node.id],
        fix: anchorNoteFix(node.id, A.note, A.annotationLink),
      }));
  },
);
