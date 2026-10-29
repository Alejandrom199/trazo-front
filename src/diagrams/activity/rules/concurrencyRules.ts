import type { DiagramNode } from '@/core/model';
import { ActivityArtifact as A } from '../artifactTypes';
import { defineRule } from './defineRule';
import { incomingOf, nodesOfType, reachableFrom, walkBackward, type FlowGraph } from './flowGraph';

const isType = (type: string) => (node: DiagramNode) => node.artifactType === type;

/** Regla: lo que un fork abre en paralelo, algún join lo vuelve a sincronizar. */
export const forkWithoutJoin = defineRule(
  {
    id: 'activity.fork-without-join',
    severity: 'warning',
    title: 'Fork sin join',
    explanation:
      'Las ramas de un fork corren en paralelo. Si ninguna llega a un join, nada espera a que terminen todas; suele ser un olvido.',
  },
  (graph) =>
    nodesOfType(graph, A.fork)
      .filter((fork) => !hasNodeOfType(graph, reachableFrom(graph, [fork.id]), A.join))
      .map((fork) => ({
        message: 'Un fork abre ramas paralelas que nunca se sincronizan en un join.',
        suggestion: 'Agrega un «Nodo de unión (join)» donde las ramas deban esperarse, o termina cada rama con un final de flujo si es intencional.',
        nodeIds: [fork.id],
      })),
);

/** Regla: un join sincroniza ramas que vienen de un fork. */
export const joinWithoutFork = defineRule(
  {
    id: 'activity.join-without-fork',
    severity: 'warning',
    title: 'Join sin fork',
    explanation:
      'Un join espera a que lleguen TODAS sus entradas. Si no vienen de un fork, normalmente no llegarán todas y el proceso se queda esperando.',
  },
  (graph) =>
    nodesOfType(graph, A.join)
      .filter((join) => !hasNodeOfType(graph, walkBackward(graph, join.id, () => false), A.fork))
      .map((join) => ({
        message: 'Un join no tiene ningún fork antes: ¿qué ramas paralelas sincroniza?',
        suggestion: 'Si solo reúne caminos alternativos, cámbialo por un «Nodo de fusión».',
        nodeIds: [join.id],
      })),
);

/**
 * Regla: una fusión NO recibe ramas paralelas de un mismo fork. Si lo hace, deja
 * pasar cada token por separado y lo que sigue se ejecuta varias veces.
 * Detección: desde cada entrada se camina hacia atrás hasta un join (que ya
 * cerró el paralelismo); si dos entradas vienen del mismo fork, son ramas paralelas.
 */
export const mergeUsedAsJoin = defineRule(
  {
    id: 'activity.merge-used-as-join',
    severity: 'error',
    title: 'Fusión usada como join',
    explanation:
      'La fusión no espera: cada rama paralela que llega la atraviesa por su cuenta, y lo que sigue se ejecuta una vez por rama. Para esperar a todas se usa un join.',
  },
  (graph) =>
    nodesOfType(graph, A.merge).flatMap((merge) => {
      const sharedForks = sharedAncestors(graph, merge, A.fork, (node) => node.artifactType === A.join);
      if (sharedForks.length === 0) return [];
      return [
        {
          message: 'Una fusión recibe ramas paralelas de un mismo fork.',
          suggestion: 'Reemplaza esa fusión por un «Nodo de unión (join)» para esperar a todas las ramas.',
          nodeIds: [merge.id, ...sharedForks],
          edgeIds: incomingOf(graph, merge.id).map((edge) => edge.id),
        },
      ];
    }),
);

/**
 * Regla: un join NO recibe caminos alternativos de una misma decisión. Solo uno de
 * ellos llega, así que el join espera para siempre (bloqueo).
 * Detección: hacia atrás hasta una fusión o un fork; si dos entradas vienen de la misma decisión, son alternativas.
 */
export const joinUsedAsMerge = defineRule(
  {
    id: 'activity.join-used-as-merge',
    severity: 'error',
    title: 'Join usado como fusión',
    explanation:
      'De una decisión sale UN solo camino, pero el join espera a todos sus entradas: el proceso queda bloqueado para siempre.',
  },
  (graph) =>
    nodesOfType(graph, A.join).flatMap((join) => {
      const sharedDecisions = sharedAncestors(
        graph,
        join,
        A.decision,
        (node) => node.artifactType === A.merge || node.artifactType === A.fork,
      );
      if (sharedDecisions.length === 0) return [];
      return [
        {
          message: 'Un join recibe caminos alternativos de una misma decisión: se quedará esperando para siempre.',
          suggestion: 'Reemplaza ese join por un «Nodo de fusión».',
          nodeIds: [join.id, ...sharedDecisions],
          edgeIds: incomingOf(graph, join.id).map((edge) => edge.id),
        },
      ];
    }),
);

function hasNodeOfType(graph: FlowGraph, ids: Set<string>, type: string): boolean {
  return [...ids].some((id) => graph.nodeById.get(id)?.artifactType === type);
}

/**
 * Ancestros de tipo `ancestorType` (fork o decisión) desde los que llegan a `node`
 * dos de sus entradas por RAMAS DISTINTAS del ancestro. Se camina hacia atrás desde
 * cada entrada sin cruzar `stopAt`, ni el propio nodo, ni otro ancestro del mismo tipo
 * (el más cercano es el que manda).
 *
 * Que vengan por ramas distintas es la clave: dos entradas que pasan por la MISMA
 * rama de un fork (p. ej. una decisión dentro de esa rama) no son paralelas entre sí.
 */
function sharedAncestors(
  graph: FlowGraph,
  node: DiagramNode,
  ancestorType: string,
  stopAt: (candidate: DiagramNode) => boolean,
): string[] {
  const isAncestor = isType(ancestorType);
  /** ancestro → lista de (índice de la entrada de `node`, rama del ancestro por la que se llegó). */
  const arrivals = new Map<string, { entry: number; branch: string }[]>();

  incomingOf(graph, node.id).forEach((entryEdge, entry) => {
    const visited = new Set<string>();
    const pending = [entryEdge];
    while (pending.length > 0) {
      const edge = pending.pop()!;
      if (visited.has(edge.id)) continue;
      visited.add(edge.id);
      const source = graph.nodeById.get(edge.sourceId);
      if (!source || source.id === node.id) continue;
      if (isAncestor(source)) {
        arrivals.set(source.id, [...(arrivals.get(source.id) ?? []), { entry, branch: edge.id }]);
        continue;
      }
      if (stopAt(source)) continue;
      pending.push(...incomingOf(graph, source.id));
    }
  });

  return [...arrivals.entries()]
    .filter(([, list]) => list.some((a) => list.some((b) => a.entry !== b.entry && a.branch !== b.branch)))
    .map(([ancestorId]) => ancestorId);
}
