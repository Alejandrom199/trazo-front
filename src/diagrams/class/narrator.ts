import type { Diagram, Narration } from '@/core/model';
import { CLASSIFIER_TYPES, ClassArtifact as C } from './artifactTypes';

const name = (label: string) => label.split('\n')[0]?.trim() || 'sin nombre';
export function narrateClass(diagram: Diagram): Narration {
  if (diagram.nodes.length === 0) return [];
  const nodes = diagram.nodes.filter((node) => CLASSIFIER_TYPES.has(node.artifactType));
  const lines: Narration = [{ text: `El modelo contiene ${nodes.length} ${nodes.length === 1 ? 'clasificador' : 'clasificadores'}.`, kind: 'start', depth: 0, nodeIds: nodes.map((node) => node.id), edgeIds: [] }];
  for (const edge of diagram.edges) {
    const source = diagram.nodes.find((node) => node.id === edge.sourceId); const target = diagram.nodes.find((node) => node.id === edge.targetId);
    if (!source || !target || edge.artifactType === C.annotationLink) continue;
    const verb: Record<string, string> = { [C.association]: 'se asocia con', [C.aggregation]: 'agrega a', [C.composition]: 'compone a', [C.generalization]: 'se especializa de', [C.realization]: 'realiza el contrato de', [C.dependency]: 'depende de' };
    lines.push({ text: `«${name(source.label)}» ${verb[edge.artifactType] ?? 'se relaciona con'} «${name(target.label)}»${edge.label ? ` (${edge.label})` : ''}.`, kind: edge.artifactType === C.composition ? 'decision' : 'step', depth: 0, nodeIds: [source.id, target.id], edgeIds: [edge.id] });
  }
  return lines;
}
