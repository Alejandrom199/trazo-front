import type { Diagram, DiagramEdge, DiagramNode, Narration, NarrationKind } from '@/core/model';
import { StateArtifact as S, STATE_TYPES } from './artifactTypes';
import { reachableFrom } from './rules';

/**
 * Narrador de la máquina de estados: dice dónde empieza, recorre los estados en
 * el orden en que se llega a ellos contando qué evento lleva a dónde, presenta
 * los estados compuestos con sus subestados y termina con las formas de acabar.
 */
export function narrateStates(diagram: Diagram): Narration {
  if (diagram.nodes.length === 0) return [];
  const lines: Narration = [];
  const say = (text: string, kind: NarrationKind, nodeIds: string[] = [], edgeIds: string[] = [], depth = 0) => lines.push({ text, kind, depth, nodeIds, edgeIds });
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const transitions = diagram.edges.filter((edge) => edge.artifactType === S.transition);
  const depthOf = (node: DiagramNode): number => (node.parentId ? 1 + depthOf(byId.get(node.parentId)!) : 0);

  const initial = diagram.nodes.find((node) => node.artifactType === S.initial && node.parentId === null);
  const first = initial && transitions.find((edge) => edge.sourceId === initial.id);
  if (first) say(`La máquina empieza en ${describe(byId.get(first.targetId))}.`, 'start', [first.targetId], [first.id]);
  else say('La máquina todavía no tiene estado inicial: no se sabe dónde empieza.', 'warning');

  // Estados en el orden en que se descubren desde el inicio; después, los inalcanzables.
  const reached = reachableFrom(diagram);
  const order = [...diagram.nodes.filter((node) => reached.has(node.id)), ...diagram.nodes.filter((node) => !reached.has(node.id))];
  for (const node of order.filter((candidate) => STATE_TYPES.has(candidate.artifactType))) {
    const depth = depthOf(node);
    if (node.artifactType === S.compositeState) {
      const inner = diagram.nodes.filter((candidate) => candidate.parentId === node.id && STATE_TYPES.has(candidate.artifactType));
      const entry = diagram.nodes.find((candidate) => candidate.parentId === node.id && candidate.artifactType === S.initial);
      const entryTarget = entry && transitions.find((edge) => edge.sourceId === entry.id);
      say(
        `${name(node)} agrupa ${list(inner.map(name)) || 'subestados por definir'}${entryTarget ? `; al entrar, empieza en ${describe(byId.get(entryTarget.targetId))}` : ''}.`,
        'participants',
        [node.id, ...inner.map((candidate) => candidate.id)],
        [],
        depth,
      );
    }
    for (const edge of transitions.filter((candidate) => candidate.sourceId === node.id)) {
      say(`Desde ${name(node)}, ${trigger(edge)} pasa a ${describe(byId.get(edge.targetId))}.`, 'step', [node.id, edge.targetId], [edge.id], depth);
      const target = byId.get(edge.targetId);
      if (target?.artifactType === S.choice) {
        for (const branch of transitions.filter((candidate) => candidate.sourceId === target.id)) {
          say(`${branch.label.trim() || 'Sin guarda'}: ${describe(byId.get(branch.targetId))}.`, 'branch', [branch.targetId], [branch.id], depth + 1);
        }
      }
    }
  }

  const finals = diagram.nodes.filter((node) => node.artifactType === S.final);
  if (finals.length > 0) say(finals.length === 1 ? 'Al llegar al estado final, la máquina termina.' : `Hay ${finals.length} formas de terminar.`, 'end', finals.map((node) => node.id));
  return lines;
}

const name = (node: DiagramNode | undefined) => `«${node?.label.trim() || 'sin nombre'}»`;

/** Nombre del destino, con lo que significa si es un pseudoestado. */
function describe(node: DiagramNode | undefined): string {
  if (node?.artifactType === S.final) return 'el estado final';
  if (node?.artifactType === S.choice) return 'una elección';
  if (node?.artifactType === S.history) return 'el último subestado en que estuvo (historia)';
  return name(node);
}

function trigger(edge: DiagramEdge): string {
  const label = edge.label.trim();
  return label ? `con «${label}»` : 'al terminar (sin evento)';
}

function list(items: string[]): string {
  if (items.length < 2) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}
