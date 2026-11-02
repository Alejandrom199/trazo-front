import type { Diagram, Narration, NarrationKind } from '@/core/model';
import { UseCaseArtifact as U } from './artifactTypes';

export function narrateUseCase(diagram: Diagram): Narration {
  if (diagram.nodes.length === 0) return [];
  const lines: Narration = [];
  const say = (text: string, kind: NarrationKind, nodeIds: string[] = [], edgeIds: string[] = [], depth = 0) =>
    lines.push({ text, kind, depth, nodeIds, edgeIds });
  const boundary = diagram.nodes.find((node) => node.artifactType === U.systemBoundary);
  const useCases = diagram.nodes.filter((node) => node.artifactType === U.useCase);
  const actors = diagram.nodes.filter((node) => node.artifactType === U.actor);

  say(`El sistema «${boundary?.label.trim() || diagram.name || 'sin nombre'}» ofrece ${useCases.length} ${useCases.length === 1 ? 'caso de uso' : 'casos de uso'}.`, 'start', boundary ? [boundary.id] : []);
  if (actors.length > 0) say(`Participan ${list(actors.map((actor) => `«${actor.label.trim() || 'sin nombre'}»`))}.`, 'participants', actors.map((actor) => actor.id));

  for (const actor of actors) {
    const associations = diagram.edges.filter((edge) => edge.artifactType === U.association && (edge.sourceId === actor.id || edge.targetId === actor.id));
    const goals = associations.map((edge) => {
      const otherId = edge.sourceId === actor.id ? edge.targetId : edge.sourceId;
      return useCases.find((useCase) => useCase.id === otherId);
    }).filter(Boolean);
    if (goals.length > 0) say(`El actor «${actor.label || 'sin nombre'}» participa en ${list(goals.map((goal) => `«${goal!.label || 'sin nombre'}»`))}.`, 'step', [actor.id, ...goals.map((goal) => goal!.id)], associations.map((edge) => edge.id));
  }

  for (const edge of diagram.edges) {
    if (![U.include, U.extend, U.generalization].includes(edge.artifactType as typeof U.include)) continue;
    const source = diagram.nodes.find((node) => node.id === edge.sourceId);
    const target = diagram.nodes.find((node) => node.id === edge.targetId);
    if (!source || !target) continue;
    const text = edge.artifactType === U.include
      ? `«${source.label}» siempre incluye «${target.label}».`
      : edge.artifactType === U.extend
        ? `«${source.label}» puede extender «${target.label}» cuando se cumple su condición.`
        : `«${source.label}» es una especialización de «${target.label}».`;
    say(text, edge.artifactType === U.extend ? 'decision' : 'step', [source.id, target.id], [edge.id]);
  }
  return lines;
}

function list(items: string[]): string {
  if (items.length < 2) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}
