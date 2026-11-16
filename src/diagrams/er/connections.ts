import type { ConnectionResult, Diagram, DiagramEdge } from '@/core/model';
import { ATTRIBUTE_OWNER_TYPES, ATTRIBUTE_TYPES, ENTITY_TYPES, ErArtifact as E, RELATIONSHIP_TYPES } from './artifactTypes';

const reject = (reason: string): ConnectionResult => ({ allowed: false, reason });

/**
 * El tipo de conexión se deduce de los extremos (notación de Chen):
 *   nota — cualquier cosa: anclaje;
 *   atributo — entidad o relación: el atributo le pertenece;
 *   atributo — atributo: atributo compuesto (p. ej. dirección → calle, ciudad);
 *   entidad — relación: participación, con su cardinalidad.
 * Dos entidades no se unen directamente: lo hacen a través de un rombo. Una
 * entidad puede participar dos veces en la misma relación (relación recursiva,
 * p. ej. Empleado «supervisa» Empleado); un atributo, una sola vez.
 */
export function resolveErConnection(diagram: Diagram, sourceId: string, targetId: string): ConnectionResult {
  const source = diagram.nodes.find((node) => node.id === sourceId);
  const target = diagram.nodes.find((node) => node.id === targetId);
  if (!source || !target) return reject('Uno de los extremos ya no existe.');
  if (sourceId === targetId) return reject('Un elemento no se conecta consigo mismo.');
  const types = [source.artifactType, target.artifactType];
  const between = linksBetween(diagram.edges, sourceId, targetId);

  if (types.includes(E.note)) {
    if (types.every((type) => type === E.note)) return reject('Una nota no se ancla a otra nota.');
    return between.length > 0 ? reject('Esta nota ya está anclada ahí.') : { allowed: true, edgeType: E.annotationLink };
  }
  const isAttribute = types.map((type) => ATTRIBUTE_TYPES.has(type));
  if (isAttribute[0] || isAttribute[1]) {
    const other = isAttribute[0] ? target.artifactType : source.artifactType;
    if (!ATTRIBUTE_TYPES.has(other) && !ATTRIBUTE_OWNER_TYPES.has(other)) return reject('Un atributo pertenece a una entidad, a una relación o a otro atributo (compuesto).');
    return between.length > 0 ? reject('Este atributo ya está unido ahí.') : { allowed: true, edgeType: E.attributeLink };
  }
  if (types.every((type) => ENTITY_TYPES.has(type))) return reject('Dos entidades no se unen directamente: pon entre ellas un rombo de relación.');
  if (types.every((type) => RELATIONSHIP_TYPES.has(type))) return reject('Dos relaciones no se unen entre sí: cada una une entidades.');
  if (types.some((type) => ENTITY_TYPES.has(type)) && types.some((type) => RELATIONSHIP_TYPES.has(type))) {
    // Hasta dos veces: la segunda es la relación recursiva (la entidad juega dos papeles).
    if (between.length >= 2) return reject('Esta entidad ya participa dos veces en esta relación.');
    return { allowed: true, edgeType: E.participation };
  }
  return reject('Esa conexión no existe en un MER.');
}

function linksBetween(edges: DiagramEdge[], a: string, b: string): DiagramEdge[] {
  return edges.filter((edge) => (edge.sourceId === a && edge.targetId === b) || (edge.sourceId === b && edge.targetId === a));
}

/** La participación nace con la cardinalidad más común, para que se vea qué escribir ahí. */
export function initialErEdge(edgeType: string): Pick<DiagramEdge, 'label' | 'props'> {
  return { label: edgeType === E.participation ? '(1,N)' : '', props: {} };
}
