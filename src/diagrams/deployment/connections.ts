import type { ConnectionResult, Diagram, DiagramEdge } from '@/core/model';
import { DeploymentArtifact as D, HOST_TYPES, MACHINE_TYPES } from './artifactTypes';

const reject = (reason: string): ConnectionResult => ({ allowed: false, reason });

/**
 * El tipo de conexión se deduce de los extremos:
 *   máquina — máquina (nodos o dispositivos): camino de comunicación;
 *   artefacto → nodo, dispositivo o entorno: despliegue «deploy»;
 *   nota — cualquier cosa: anclaje.
 */
export function resolveDeploymentConnection(diagram: Diagram, sourceId: string, targetId: string): ConnectionResult {
  const source = diagram.nodes.find((node) => node.id === sourceId);
  const target = diagram.nodes.find((node) => node.id === targetId);
  if (!source || !target) return reject('Uno de los extremos ya no existe.');
  if (sourceId === targetId) return reject('Un elemento no se conecta consigo mismo.');
  if (alreadyConnected(diagram.edges, sourceId, targetId)) return reject('Estos elementos ya están conectados.');

  if (source.artifactType === D.note || target.artifactType === D.note) {
    return source.artifactType === target.artifactType ? reject('Una nota no se ancla a otra nota.') : { allowed: true, edgeType: D.annotationLink };
  }
  if (MACHINE_TYPES.has(source.artifactType) && MACHINE_TYPES.has(target.artifactType)) return { allowed: true, edgeType: D.communicationPath };
  if (source.artifactType === D.artifact && HOST_TYPES.has(target.artifactType)) return { allowed: true, edgeType: D.deployment };
  if (target.artifactType === D.artifact && HOST_TYPES.has(source.artifactType)) {
    return reject('El despliegue va del artefacto hacia donde se instala: arrastra desde el artefacto.');
  }
  return reject('Une máquinas entre sí (camino de comunicación) o un artefacto con donde se instala («deploy»).');
}

function alreadyConnected(edges: DiagramEdge[], a: string, b: string): boolean {
  return edges.some((edge) => (edge.sourceId === a && edge.targetId === b) || (edge.sourceId === b && edge.targetId === a));
}

/** Un despliegue nuevo nace rotulado «deploy»; un camino, sin protocolo (se escribe después). */
export function initialDeploymentEdge(edgeType: string): Pick<DiagramEdge, 'label' | 'props'> {
  return { label: edgeType === D.deployment ? '«deploy»' : '', props: {} };
}
