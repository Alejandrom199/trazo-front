import { nodeName, type Diagram, type DiagramNode, type ValidationIssue, type ValidationRule } from '@/core/model';
import { normalizeName } from '@/diagrams/crossDiagram/names';
import { ATTRIBUTE_OWNER_TYPES, ATTRIBUTE_TYPES, ENTITY_TYPES, ErArtifact as E, RELATIONSHIP_TYPES } from './artifactTypes';

/**
 * Reglas del MER. Cada una describe un problema de modelo de datos (no de
 * dibujo): lo que, llevado a tablas, daría una base de datos incorrecta.
 */

const neighbors = (diagram: Diagram, nodeId: string, edgeType: string): DiagramNode[] =>
  diagram.edges
    .filter((edge) => edge.artifactType === edgeType && (edge.sourceId === nodeId || edge.targetId === nodeId))
    .map((edge) => diagram.nodes.find((node) => node.id === (edge.sourceId === nodeId ? edge.targetId : edge.sourceId)))
    .filter((node): node is DiagramNode => node !== undefined);

const ofTypes = (diagram: Diagram, types: ReadonlySet<string>) => diagram.nodes.filter((node) => types.has(node.artifactType));
const quoted = (node: DiagramNode) => `«${nodeName(node)}»`;

/** Lo que cada regla aporta de un problema; id, gravedad y flechas vacías los completa `rule`. */
type IssueDetails = Pick<ValidationIssue, 'message' | 'suggestion' | 'nodeIds'> & { edgeIds?: string[] };

function rule(meta: Omit<ValidationRule, 'check' | 'diagramType'>, find: (diagram: Diagram) => IssueDetails[]): ValidationRule {
  return {
    ...meta,
    diagramType: 'er',
    check: (diagram) => find(diagram).map((issue) => ({ ruleId: meta.id, severity: meta.severity, edgeIds: [], ...issue })),
  };
}

/** Entidad fuerte sin clave: sus filas no se podrían distinguir unas de otras. */
export const entityWithoutKey = rule(
  { id: 'er.entity-without-key', severity: 'warning', title: 'Entidad sin clave', explanation: 'Toda entidad fuerte necesita un atributo clave (subrayado) que identifique cada ocurrencia: será la clave primaria de su tabla.' },
  (diagram) => ofTypes(diagram, new Set([E.entity]))
    .filter((entity) => !neighbors(diagram, entity.id, E.attributeLink).some((attribute) => attribute.artifactType === E.keyAttribute))
    .map((entity) => ({ message: `${quoted(entity)} no tiene atributo clave.`, suggestion: 'Agrégale un atributo clave (p. ej. «id») y únelo a la entidad.', nodeIds: [entity.id] })),
);

/** Entidad débil sin relación identificadora: no hay de quién tome su identidad. */
export const weakEntityWithoutOwner = rule(
  { id: 'er.weak-entity-without-owner', severity: 'error', title: 'Entidad débil sin dueño', explanation: 'Una entidad débil no se identifica por sí sola: depende de una entidad fuerte a través de una relación identificadora (rombo doble).' },
  (diagram) => ofTypes(diagram, new Set([E.weakEntity]))
    .filter((weak) => !neighbors(diagram, weak.id, E.participation).some((relation) => relation.artifactType === E.identifyingRelationship))
    .map((weak) => ({ message: `${quoted(weak)} es débil pero no participa en una relación identificadora.`, suggestion: 'Únela con un rombo doble a la entidad de la que depende.', nodeIds: [weak.id] })),
);

/** Relación con menos de dos participaciones: no relaciona nada. */
export const relationshipArity = rule(
  { id: 'er.relationship-arity', severity: 'error', title: 'Relación incompleta', explanation: 'Una relación une al menos dos papeles: dos entidades, o la misma dos veces (relación recursiva).' },
  (diagram) => ofTypes(diagram, RELATIONSHIP_TYPES)
    .filter((relation) => diagram.edges.filter((edge) => edge.artifactType === E.participation && (edge.sourceId === relation.id || edge.targetId === relation.id)).length < 2)
    .map((relation) => ({ message: `La relación ${quoted(relation)} no une dos entidades.`, suggestion: 'Conéctala con las entidades que relaciona (o dos veces con la misma, si es recursiva).', nodeIds: [relation.id] })),
);

/** Participación sin cardinalidad: no se sabe cuántas ocurrencias se relacionan. */
export const participationWithoutCardinality = rule(
  { id: 'er.participation-without-cardinality', severity: 'warning', title: 'Participación sin cardinalidad', explanation: 'La cardinalidad (mín,máx) dice cuántas veces participa cada ocurrencia: decide si la relación será una clave foránea o una tabla propia.' },
  (diagram) => diagram.edges
    .filter((edge) => edge.artifactType === E.participation && !edge.label.trim())
    .map((edge) => ({ message: 'Hay una participación sin cardinalidad.', suggestion: 'Escribe su cardinalidad, p. ej. (1,1), (0,N) o (1,N).', nodeIds: [edge.sourceId, edge.targetId], edgeIds: [edge.id] })),
);

/** Atributo suelto: no se sabe de qué entidad es. */
export const orphanAttribute = rule(
  { id: 'er.orphan-attribute', severity: 'warning', title: 'Atributo sin dueño', explanation: 'Un atributo describe a una entidad o a una relación; suelto, no se sabe en qué tabla irá.' },
  (diagram) => ofTypes(diagram, ATTRIBUTE_TYPES)
    .filter((attribute) => neighbors(diagram, attribute.id, E.attributeLink).length === 0)
    .map((attribute) => ({ message: `El atributo ${quoted(attribute)} no pertenece a nada.`, suggestion: 'Únelo a su entidad o relación.', nodeIds: [attribute.id] })),
);

/** Atributo de dos dueños: en tablas, sería el mismo dato guardado dos veces. */
export const sharedAttribute = rule(
  { id: 'er.shared-attribute', severity: 'warning', title: 'Atributo con dos dueños', explanation: 'Cada atributo pertenece a una sola entidad o relación. Si dos lo necesitan, cada una tiene el suyo, o el dato vive en una y la otra lo alcanza por la relación.' },
  (diagram) => ofTypes(diagram, ATTRIBUTE_TYPES)
    .map((attribute) => ({ attribute, owners: neighbors(diagram, attribute.id, E.attributeLink).filter((node) => ATTRIBUTE_OWNER_TYPES.has(node.artifactType)) }))
    .filter(({ owners }) => owners.length > 1)
    .map(({ attribute, owners }) => ({ message: `${quoted(attribute)} pertenece a ${owners.map(quoted).join(' y ')}.`, suggestion: 'Déjalo en una sola o crea uno para cada una.', nodeIds: [attribute.id, ...owners.map((node) => node.id)] })),
);

/** Dos entidades con el mismo nombre: serían dos tablas iguales. */
export const duplicateEntity = rule(
  { id: 'er.duplicate-entity', severity: 'error', title: 'Entidad repetida', explanation: 'Cada entidad se dibuja una sola vez; para relacionarla con varias, une varias relaciones a la misma figura.' },
  (diagram) => {
    const byName = new Map<string, DiagramNode[]>();
    for (const entity of ofTypes(diagram, ENTITY_TYPES)) {
      const key = normalizeName(nodeName(entity, ''));
      if (key) byName.set(key, [...(byName.get(key) ?? []), entity]);
    }
    return [...byName.values()]
      .filter((group) => group.length > 1)
      .map((group) => ({ message: `${quoted(group[0]!)} está dibujada ${group.length} veces.`, suggestion: 'Deja una sola y une a ella todas sus relaciones.', nodeIds: group.map((node) => node.id) }));
  },
);

/** Elemento sin nombre: no se sabría cómo llamar a la tabla o la columna. */
export const unnamedElement = rule(
  { id: 'er.unnamed', severity: 'warning', title: 'Elemento sin nombre', explanation: 'Entidades, relaciones y atributos se convierten en tablas y columnas: todos necesitan nombre.' },
  (diagram) => diagram.nodes
    .filter((node) => node.artifactType !== E.note && !node.label.trim())
    .map((node) => ({ message: 'Hay un elemento sin nombre.', suggestion: 'Haz doble clic y escríbele un nombre.', nodeIds: [node.id] })),
);

export const erRules: ValidationRule[] = [
  weakEntityWithoutOwner,
  relationshipArity,
  duplicateEntity,
  entityWithoutKey,
  participationWithoutCardinality,
  orphanAttribute,
  sharedAttribute,
  unnamedElement,
];
