import type { ConnectionResult, Diagram } from '@/core/model';
import { StateArtifact as S } from './artifactTypes';

const reject = (reason: string): ConnectionResult => ({ allowed: false, reason });

/**
 * El tipo de conexión se deduce de los extremos:
 *   nota — cualquier cosa: anclaje;
 *   el resto: transición, salvo que entre al estado inicial o salga del final.
 * Se admiten transiciones de ida y de vuelta entre dos estados (A → B y B → A),
 * que son habituales; no dos iguales en el mismo sentido.
 */
export function resolveStateConnection(diagram: Diagram, sourceId: string, targetId: string): ConnectionResult {
  const source = diagram.nodes.find((node) => node.id === sourceId);
  const target = diagram.nodes.find((node) => node.id === targetId);
  if (!source || !target) return reject('Uno de los extremos ya no existe.');
  if (sourceId === targetId) return reject('Por ahora una transición no puede volver al mismo estado.');

  if (source.artifactType === S.note || target.artifactType === S.note) {
    if (source.artifactType === target.artifactType) return reject('Una nota no se ancla a otra nota.');
    return linked(diagram, sourceId, targetId, true) ? reject('Esta nota ya está anclada ahí.') : { allowed: true, edgeType: S.annotationLink };
  }
  if (target.artifactType === S.initial) return reject('Nada llega al estado inicial: es donde empieza la máquina.');
  if (source.artifactType === S.final) return reject('El estado final no tiene salidas: ahí termina la máquina.');
  if (source.artifactType === S.initial && diagram.edges.some((edge) => edge.sourceId === sourceId)) {
    return reject('El estado inicial tiene una sola transición de salida.');
  }
  if (linked(diagram, sourceId, targetId, false)) return reject('Ya hay una transición en este sentido: escribe varios eventos en su rótulo.');
  return { allowed: true, edgeType: S.transition };
}

function linked(diagram: Diagram, a: string, b: string, anyDirection: boolean): boolean {
  return diagram.edges.some((edge) => (edge.sourceId === a && edge.targetId === b) || (anyDirection && edge.sourceId === b && edge.targetId === a));
}
