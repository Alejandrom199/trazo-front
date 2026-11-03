import type { Diagram, DiagramNode, Narration, NarrationKind } from '@/core/model';
import { DEPENDENCY_TYPES, PackageArtifact as P } from './artifactTypes';
import { dependencyCycles } from './rules';

const VERB: Record<string, string> = {
  [P.dependency]: 'depende de',
  [P.packageImport]: 'importa (y reexpone)',
  [P.packageAccess]: 'usa en privado («access»)',
};

/**
 * Narrador del diagrama de paquetes: presenta los paquetes de primer nivel, baja
 * por su contenido, cuenta quién depende de quién y avisa de los ciclos.
 */
export function narratePackages(diagram: Diagram): Narration {
  if (diagram.nodes.length === 0) return [];
  const lines: Narration = [];
  const say = (text: string, kind: NarrationKind, nodeIds: string[] = [], edgeIds: string[] = [], depth = 0) => lines.push({ text, kind, depth, nodeIds, edgeIds });
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const childrenOf = (id: string | null) => diagram.nodes.filter((node) => node.parentId === id && node.artifactType !== P.note);

  const top = childrenOf(null).filter((node) => node.artifactType === P.package);
  if (top.length > 0) say(`El sistema se divide en ${top.length} ${top.length === 1 ? 'paquete' : 'paquetes'}: ${list(top.map(name))}.`, 'start', top.map((node) => node.id));

  const tell = (container: DiagramNode, depth: number) => {
    const inside = childrenOf(container.id);
    if (inside.length === 0) return;
    say(`${name(container)} contiene ${list(inside.map(name))}.`, 'participants', [container.id, ...inside.map((node) => node.id)], [], depth);
    for (const child of inside.filter((node) => node.artifactType === P.package)) tell(child, depth + 1);
  };
  for (const pkg of top) tell(pkg, 0);

  for (const edge of diagram.edges.filter((candidate) => DEPENDENCY_TYPES.includes(candidate.artifactType))) {
    say(`${name(byId.get(edge.sourceId))} ${VERB[edge.artifactType]} ${name(byId.get(edge.targetId))}.`, 'step', [edge.sourceId, edge.targetId], [edge.id]);
  }
  for (const { nodeIds, edgeIds } of dependencyCycles(diagram)) {
    say(`Ojo: ${list(nodeIds.map((id) => name(byId.get(id))))} dependen unos de otros en círculo.`, 'warning', nodeIds, edgeIds);
  }
  return lines;
}

const name = (node: DiagramNode | undefined) => `«${node?.label.trim() || 'sin nombre'}»`;

function list(items: string[]): string {
  if (items.length < 2) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}
