import type { ConnectionResult, Diagram, DiagramEdge, DiagramNode } from '@/core/model';
import { UseCaseArtifact as U } from './artifactTypes';

const reject = (reason: string): ConnectionResult => ({ allowed: false, reason });

export function resolveUseCaseConnection(diagram: Diagram, sourceId: string, targetId: string): ConnectionResult {
  const source = diagram.nodes.find((node) => node.id === sourceId);
  const target = diagram.nodes.find((node) => node.id === targetId);
  if (!source || !target) return reject('Uno de los extremos ya no existe.');
  if (sourceId === targetId) return reject('Un elemento no puede relacionarse consigo mismo.');
  if ([source, target].some((node) => node.artifactType === U.systemBoundary)) {
    return reject('El límite del sistema contiene casos de uso, pero no participa en relaciones.');
  }
  if (alreadyConnected(diagram.edges, sourceId, targetId)) return reject('Estos elementos ya están relacionados.');

  const is = (node: DiagramNode, type: string) => node.artifactType === type;
  if (is(source, U.note) || is(target, U.note)) {
    if (is(source, U.note) && is(target, U.note)) return reject('Una nota no se ancla a otra nota.');
    return { allowed: true, edgeType: U.annotationLink };
  }
  if ((is(source, U.actor) && is(target, U.useCase)) || (is(source, U.useCase) && is(target, U.actor))) {
    return { allowed: true, edgeType: U.association };
  }
  if (is(source, U.useCase) && is(target, U.useCase)) return { allowed: true, edgeType: U.include };
  if (is(source, U.actor) && is(target, U.actor)) return { allowed: true, edgeType: U.generalization };
  return reject('Relaciona actores con casos de uso, casos de uso entre sí o actores mediante generalización.');
}

function alreadyConnected(edges: DiagramEdge[], a: string, b: string): boolean {
  return edges.some((edge) => (edge.sourceId === a && edge.targetId === b) || (edge.sourceId === b && edge.targetId === a));
}

export function initialUseCaseEdge(edgeType: string): { label: string; props: Record<string, unknown> } {
  if (edgeType === U.include) return { label: '«include»', props: {} };
  if (edgeType === U.extend) return { label: '«extend»', props: {} };
  return { label: '', props: {} };
}
