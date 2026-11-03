import type { Diagram, DiagramNode, Narration, NarrationKind } from '@/core/model';
import { DeploymentArtifact as D, MACHINE_TYPES } from './artifactTypes';
import { hostsOf } from './rules';

/**
 * Narrador del diagrama de despliegue: presenta las máquinas, cuenta qué corre en
 * cada una (entornos y artefactos, por niveles), cómo se comunican y con qué
 * protocolo, y avisa de los artefactos que no están desplegados.
 */
export function narrateDeployment(diagram: Diagram): Narration {
  if (diagram.nodes.length === 0) return [];
  const lines: Narration = [];
  const say = (text: string, kind: NarrationKind, nodeIds: string[] = [], edgeIds: string[] = [], depth = 0) => lines.push({ text, kind, depth, nodeIds, edgeIds });
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const childrenOf = (id: string) => diagram.nodes.filter((node) => node.parentId === id);
  const machines = diagram.nodes.filter((node) => MACHINE_TYPES.has(node.artifactType));

  say(`La infraestructura tiene ${machines.length} ${machines.length === 1 ? 'máquina' : 'máquinas'}: ${list(machines.map(name))}.`, 'start', machines.map((node) => node.id));

  // Qué corre en cada máquina, bajando por sus entornos de ejecución.
  const tell = (host: DiagramNode, depth: number) => {
    const environments = childrenOf(host.id).filter((node) => node.artifactType === D.executionEnvironment);
    const artifacts = diagram.nodes.filter((node) => node.artifactType === D.artifact && hostsOf(diagram, node).some((place) => place.id === host.id));
    if (artifacts.length > 0) say(`En ${name(host)} se despliega ${list(artifacts.map(name))}.`, 'step', [host.id, ...artifacts.map((node) => node.id)], [], depth);
    for (const environment of environments) {
      say(`${name(host)} ejecuta ${name(environment)}.`, 'step', [host.id, environment.id], [], depth);
      tell(environment, depth + 1);
    }
  };
  for (const machine of machines) tell(machine, 0);

  for (const edge of diagram.edges.filter((candidate) => candidate.artifactType === D.communicationPath)) {
    const protocol = edge.label.trim();
    say(`${name(byId.get(edge.sourceId))} se comunica con ${name(byId.get(edge.targetId))}${protocol ? ` por ${protocol}` : ''}.`, 'merge', [edge.sourceId, edge.targetId], [edge.id]);
  }

  for (const artifact of diagram.nodes.filter((node) => node.artifactType === D.artifact && hostsOf(diagram, node).length === 0)) {
    say(`${name(artifact)} todavía no está desplegado en ninguna parte.`, 'warning', [artifact.id]);
  }
  return lines;
}

const name = (node: DiagramNode | undefined) => `«${node?.label.trim() || 'sin nombre'}»`;

function list(items: string[]): string {
  if (items.length < 2) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}
