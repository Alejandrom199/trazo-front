/**
 * Claves del catálogo del diagrama entidad-relación (MER, notación de Chen).
 * Usar estas constantes en vez de strings sueltos evita errores de tipeo.
 */
export const ErArtifact = {
  entity: 'entity',
  weakEntity: 'weakEntity',
  relationship: 'relationship',
  identifyingRelationship: 'identifyingRelationship',
  attribute: 'attribute',
  keyAttribute: 'keyAttribute',
  multivaluedAttribute: 'multivaluedAttribute',
  derivedAttribute: 'derivedAttribute',
  note: 'note',
  attributeLink: 'attributeLink',
  participation: 'participation',
  annotationLink: 'annotationLink',
} as const;

const E = ErArtifact;

/** Entidades: las «cosas» de las que se guardan datos. */
export const ENTITY_TYPES: ReadonlySet<string> = new Set([E.entity, E.weakEntity]);

/** Relaciones: el rombo que une entidades. */
export const RELATIONSHIP_TYPES: ReadonlySet<string> = new Set([E.relationship, E.identifyingRelationship]);

/** Atributos: los datos de una entidad o de una relación. */
export const ATTRIBUTE_TYPES: ReadonlySet<string> = new Set([E.attribute, E.keyAttribute, E.multivaluedAttribute, E.derivedAttribute]);

/** Lo que puede tener atributos: entidades y relaciones (p. ej. la fecha de un préstamo). */
export const ATTRIBUTE_OWNER_TYPES: ReadonlySet<string> = new Set([...ENTITY_TYPES, ...RELATIONSHIP_TYPES]);
