import { DEFAULT_EDGE_OFFSET, EDGE_OFFSET_KEY, absolutePosition, type ConnectionResult, type Diagram, type DiagramEdge } from '@/core/model';
import { MESSAGE_TYPES, PARTICIPANT_TYPES, SequenceArtifact as S } from './artifactTypes';
import { buildSequenceModel } from './sequenceModel';

function reject(reason: string): ConnectionResult {
  return { allowed: false, reason };
}

/**
 * Decide si se puede unir `sourceId` → `targetId` y con qué conexión:
 *   - entre participantes (o de uno a sí mismo): un mensaje síncrono, el más
 *     común; luego se cambia de tipo en sus propiedades.
 *   - con una nota: su anclaje.
 * Lo demás (activaciones, destrucciones, fragmentos) no se conecta.
 */
export function resolveSequenceConnection(diagram: Diagram, sourceId: string, targetId: string): ConnectionResult {
  const source = diagram.nodes.find((node) => node.id === sourceId);
  const target = diagram.nodes.find((node) => node.id === targetId);
  if (!source || !target) return reject('Uno de los extremos ya no existe.');

  const isNote = (type: string) => type === S.note;
  if (isNote(source.artifactType) && isNote(target.artifactType)) return reject('Una nota se ancla a un elemento, no a otra nota.');
  if (isNote(source.artifactType) || isNote(target.artifactType)) {
    if (source.id === target.id) return reject('Una nota no se ancla a sí misma.');
    const alreadyLinked = diagram.edges.some(
      (edge) => edge.artifactType === S.annotationLink && new Set([edge.sourceId, edge.targetId, sourceId, targetId]).size === 2,
    );
    return alreadyLinked ? reject('Esta nota ya está anclada a ese elemento.') : { allowed: true, edgeType: S.annotationLink };
  }

  if (PARTICIPANT_TYPES.has(source.artifactType) && PARTICIPANT_TYPES.has(target.artifactType)) {
    return { allowed: true, edgeType: S.syncMessage };
  }
  return reject('Los mensajes van entre líneas de vida o actores: arrastra desde la línea de uno hasta la de otro.');
}

/** Separación vertical entre un mensaje y el siguiente. */
export const MESSAGE_GAP = 40;

/**
 * Un mensaje nuevo queda debajo del último que ya existe (el siguiente en el
 * tiempo); después se sube o baja con su tirador. El resto empieza vacío.
 */
export function initialSequenceEdge(diagram: Diagram, edgeType: string, sourceId: string): Pick<DiagramEdge, 'label' | 'props'> {
  if (!MESSAGE_TYPES.includes(edgeType)) return { label: '', props: {} };
  const source = diagram.nodes.find((node) => node.id === sourceId);
  const top = source ? absolutePosition(diagram, source).y : 0;
  const last = buildSequenceModel(diagram).messages.at(-1);
  const offset = last ? last.y + MESSAGE_GAP - top : DEFAULT_EDGE_OFFSET;
  return { label: '', props: { [EDGE_OFFSET_KEY]: offset } };
}
