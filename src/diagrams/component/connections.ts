import type { ConnectionResult, Diagram, DiagramEdge, DiagramNode } from '@/core/model';
import { ComponentArtifact as C } from './artifactTypes';

const reject = (reason: string): ConnectionResult => ({ allowed: false, reason });

/**
 * El tipo de conexión se deduce de los extremos:
 *   componente — interfaz provista: provisión;  componente — interfaz requerida: requerimiento;
 *   interfaz requerida — interfaz provista: ensamble;  componente → componente: dependencia;
 *   nota — cualquier cosa: anclaje. El subsistema no se conecta (se conectan sus componentes).
 */
export function resolveComponentConnection(diagram: Diagram, sourceId: string, targetId: string): ConnectionResult {
  const source = diagram.nodes.find((node) => node.id === sourceId);
  const target = diagram.nodes.find((node) => node.id === targetId);
  if (!source || !target) return reject('Uno de los extremos ya no existe.');
  if (sourceId === targetId) return reject('Un elemento no se conecta consigo mismo.');
  if (source.artifactType === C.subsystem || target.artifactType === C.subsystem) {
    return reject('El subsistema agrupa componentes, pero no se conecta: conecta los componentes de dentro.');
  }
  if (alreadyConnected(diagram.edges, sourceId, targetId)) return reject('Estos elementos ya están conectados.');

  const pair = (a: string, b: string) => (source.artifactType === a && target.artifactType === b) || (source.artifactType === b && target.artifactType === a);
  const is = (node: DiagramNode, type: string) => node.artifactType === type;

  if (is(source, C.note) || is(target, C.note)) {
    return is(source, C.note) && is(target, C.note) ? reject('Una nota no se ancla a otra nota.') : { allowed: true, edgeType: C.annotationLink };
  }
  if (pair(C.component, C.providedInterface)) return { allowed: true, edgeType: C.provision };
  if (pair(C.component, C.requiredInterface)) return { allowed: true, edgeType: C.requirement };
  if (pair(C.requiredInterface, C.providedInterface)) return { allowed: true, edgeType: C.assembly };
  if (is(source, C.component) && is(target, C.component)) return { allowed: true, edgeType: C.dependency };
  return reject('Une una interfaz requerida (enchufe) con una provista (piruleta), o cada interfaz con su componente.');
}

function alreadyConnected(edges: DiagramEdge[], a: string, b: string): boolean {
  return edges.some((edge) => (edge.sourceId === a && edge.targetId === b) || (edge.sourceId === b && edge.targetId === a));
}

/** Una dependencia nueva nace rotulada «use». */
export function initialComponentEdge(edgeType: string): Pick<DiagramEdge, 'label' | 'props'> {
  return { label: edgeType === C.dependency ? '«use»' : '', props: {} };
}
