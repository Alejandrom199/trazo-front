import { nodeName, type Diagram, type DiagramNode, type Narration, type NarrationKind } from '@/core/model';
import { ATTRIBUTE_TYPES, ENTITY_TYPES, ErArtifact as E, RELATIONSHIP_TYPES } from './artifactTypes';

/**
 * Narrador del MER: presenta las entidades, cómo se identifica cada una y qué
 * datos guarda; después cuenta cada relación con sus cardinalidades, como se
 * leería en voz alta («Un Cliente (0,N) realiza Pedido…»).
 */
export function narrateEr(diagram: Diagram): Narration {
  const entities = diagram.nodes.filter((node) => ENTITY_TYPES.has(node.artifactType));
  if (entities.length === 0) return [];
  const lines: Narration = [];
  const say = (text: string, kind: NarrationKind, nodeIds: string[] = [], edgeIds: string[] = [], depth = 0) => lines.push({ text, kind, depth, nodeIds, edgeIds });
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const other = (edge: { sourceId: string; targetId: string }, id: string) => byId.get(edge.sourceId === id ? edge.targetId : edge.sourceId);
  const attributesOf = (id: string) => diagram.edges
    .filter((edge) => edge.artifactType === E.attributeLink && (edge.sourceId === id || edge.targetId === id))
    .map((edge) => other(edge, id))
    .filter((node): node is DiagramNode => node !== undefined && ATTRIBUTE_TYPES.has(node.artifactType));

  say(`El modelo guarda datos de ${entities.length} ${entities.length === 1 ? 'entidad' : 'entidades'}: ${list(entities.map(quoted))}.`, 'start', entities.map((node) => node.id));

  for (const entity of entities) {
    const attributes = attributesOf(entity.id);
    const keys = attributes.filter((node) => node.artifactType === E.keyAttribute);
    const rest = attributes.filter((node) => node.artifactType !== E.keyAttribute).map(describeAttribute);
    const weak = entity.artifactType === E.weakEntity ? ' (débil: depende de otra para identificarse)' : '';
    const identity = keys.length > 0 ? `se identifica por ${list(keys.map(quoted))}` : 'no tiene clave';
    say(`${quoted(entity)}${weak} ${identity}${rest.length > 0 ? ` y guarda ${list(rest)}` : ''}.`, 'participants', [entity.id, ...attributes.map((node) => node.id)]);
  }

  for (const relation of diagram.nodes.filter((node) => RELATIONSHIP_TYPES.has(node.artifactType))) {
    const roles = diagram.edges.filter((edge) => edge.artifactType === E.participation && (edge.sourceId === relation.id || edge.targetId === relation.id));
    const sides = roles.map((edge) => `${quoted(other(edge, relation.id))}${edge.label.trim() ? ` ${edge.label.trim()}` : ''}`);
    const ownData = attributesOf(relation.id);
    const verb = relation.artifactType === E.identifyingRelationship ? 'identifica' : 'relaciona';
    say(
      `La relación ${quoted(relation)} ${verb} ${list(sides) || 'sin entidades'}${ownData.length > 0 ? `, y guarda ${list(ownData.map(describeAttribute))}` : ''}.`,
      'step',
      [relation.id, ...roles.map((edge) => (edge.sourceId === relation.id ? edge.targetId : edge.sourceId))],
      roles.map((edge) => edge.id),
    );
  }
  return lines;
}

const quoted = (node: DiagramNode | undefined) => `«${nodeName(node)}»`;

function describeAttribute(node: DiagramNode): string {
  if (node.artifactType === E.multivaluedAttribute) return `${quoted(node)} (varios valores)`;
  if (node.artifactType === E.derivedAttribute) return `${quoted(node)} (se calcula)`;
  return quoted(node);
}

function list(items: string[]): string {
  if (items.length < 2) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}
