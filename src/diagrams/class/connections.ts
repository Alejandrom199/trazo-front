import type { ConnectionResult, Diagram, DiagramEdge } from '@/core/model';
import { CLASSIFIER_TYPES, ClassArtifact as C } from './artifactTypes';

const reject = (reason: string): ConnectionResult => ({ allowed: false, reason });
export function resolveClassConnection(diagram: Diagram, sourceId: string, targetId: string): ConnectionResult {
  const source = diagram.nodes.find((node) => node.id === sourceId);
  const target = diagram.nodes.find((node) => node.id === targetId);
  if (!source || !target) return reject('Uno de los extremos ya no existe.');
  if (sourceId === targetId) return reject('Usa una asociación reflexiva desde las propiedades; no conectes el mismo punto consigo mismo.');
  if (source.artifactType === C.package || target.artifactType === C.package) return reject('El paquete agrupa clasificadores, pero no participa en relaciones estructurales.');
  if (connected(diagram.edges, sourceId, targetId)) return reject('Estos elementos ya están relacionados.');
  if (source.artifactType === C.note || target.artifactType === C.note) return source.artifactType === target.artifactType ? reject('Una nota no se ancla a otra nota.') : { allowed: true, edgeType: C.annotationLink };
  if (CLASSIFIER_TYPES.has(source.artifactType) && CLASSIFIER_TYPES.has(target.artifactType)) return { allowed: true, edgeType: C.association };
  return reject('Relaciona clases, interfaces o enumeraciones; las notas se anclan a un clasificador.');
}
const connected = (edges: DiagramEdge[], a: string, b: string) => edges.some((edge) => (edge.sourceId === a && edge.targetId === b) || (edge.sourceId === b && edge.targetId === a));

/**
 * Estereotipos por defecto al crear o cambiar el tipo de una relación.
 * Asociación, agregación y composición no llevan estereotipo (van con multiplicidad).
 */
export const CLASS_EDGE_STEREOTYPE: Readonly<Record<string, string>> = {
  [C.generalization]: '«extends»',
  [C.dependency]: '«use»',
  [C.realization]: '«implements»',
};

/** Dependencia y realización nacen rotuladas; el resto, sin texto (multiplicidad se escribe después). */
export function initialClassEdge(edgeType: string): Pick<DiagramEdge, 'label' | 'props'> {
  return { label: CLASS_EDGE_STEREOTYPE[edgeType] ?? '', props: {} };
}
