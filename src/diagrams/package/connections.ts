import { isInsideOf, type ConnectionResult, type Diagram, type DiagramEdge } from '@/core/model';
import { DEPENDENCY_STEREOTYPE, PackageArtifact as P } from './artifactTypes';

const reject = (reason: string): ConnectionResult => ({ allowed: false, reason });

/**
 * El tipo de conexión se deduce de los extremos:
 *   nota — cualquier cosa: anclaje;
 *   paquete o elemento → paquete o elemento: dependencia (se puede cambiar a
 *     «import» o «access» desde la paleta o la selección).
 * Un elemento no depende de su propio contenedor: pertenecer ya lo implica.
 */
export function resolvePackageConnection(diagram: Diagram, sourceId: string, targetId: string): ConnectionResult {
  const source = diagram.nodes.find((node) => node.id === sourceId);
  const target = diagram.nodes.find((node) => node.id === targetId);
  if (!source || !target) return reject('Uno de los extremos ya no existe.');
  if (sourceId === targetId) return reject('Un elemento no depende de sí mismo.');

  if (source.artifactType === P.note || target.artifactType === P.note) {
    if (source.artifactType === target.artifactType) return reject('Una nota no se ancla a otra nota.');
    return linked(diagram.edges, sourceId, targetId, true) ? reject('Esta nota ya está anclada ahí.') : { allowed: true, edgeType: P.annotationLink };
  }
  if (isInsideOf(diagram, source, targetId) || isInsideOf(diagram, target, sourceId)) {
    return reject('Uno está dentro del otro: pertenecer al paquete ya implica la relación.');
  }
  if (linked(diagram.edges, sourceId, targetId, false)) return reject('Ya hay una dependencia en este sentido.');
  return { allowed: true, edgeType: P.dependency };
}

function linked(edges: DiagramEdge[], a: string, b: string, anyDirection: boolean): boolean {
  return edges.some((edge) => (edge.sourceId === a && edge.targetId === b) || (anyDirection && edge.sourceId === b && edge.targetId === a));
}

/** «import» y «access» nacen rotulados con su estereotipo; la dependencia, sin texto. */
export function initialPackageEdge(edgeType: string): Pick<DiagramEdge, 'label' | 'props'> {
  return { label: DEPENDENCY_STEREOTYPE[edgeType] ?? '', props: {} };
}
