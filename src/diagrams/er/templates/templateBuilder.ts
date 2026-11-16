import { addEdge, addNode, createEmptyDiagram, DEFAULT_EDGE_SHAPE, type Diagram, type Position, type Template } from '@/core/model';
import { ErArtifact as E } from '../artifactTypes';
import { initialErEdge, resolveErConnection } from '../connections';
import { erEdgeKinds, erNodeKinds } from '../nodeKinds';

export type TemplateInfo = Omit<Template, 'diagram' | 'diagramType'>;

/** Tipo de atributo en la lista abreviada: «key» clave, «multi» multivaluado, «derived» derivado. */
type AttributeSpec = string | [string, 'key' | 'multi' | 'derived'];

const ATTRIBUTE_TYPE = { key: E.keyAttribute, multi: E.multivaluedAttribute, derived: E.derivedAttribute } as const;

/** Separación entre atributos vecinos y distancia a su dueño. */
const ATTRIBUTE_GAP = 32;
const ATTRIBUTE_DISTANCE = 44;

/**
 * Ayuda a escribir plantillas del MER. Cada conexión pasa por la misma regla
 * que usa el editor, así una plantilla no puede enseñar algo que el editor
 * rechazaría. Los atributos se reparten solos arriba o abajo de su dueño.
 */
export function createErTemplateBuilder() {
  let diagram: Diagram = createEmptyDiagram({ diagramType: 'er', name: '' }, new Date(0));
  let sequence = 0;
  const nextId = () => `er${++sequence}`;

  function add(artifactType: string, label: string, position: Position): string {
    const kind = erNodeKinds[artifactType];
    if (!kind) throw new Error(`Artefacto desconocido en plantilla: "${artifactType}".`);
    const id = nextId();
    diagram = addNode(diagram, { id, artifactType, label, position, size: { ...kind.defaultSize }, parentId: null, props: { ...kind.defaultProps }, notes: '', locked: false });
    return id;
  }

  function connect(sourceId: string, targetId: string, label?: string, waypoints: Position[] = []): void {
    const result = resolveErConnection(diagram, sourceId, targetId);
    if (!result.allowed) throw new Error(`Plantilla inválida (${sourceId} → ${targetId}): ${result.reason}`);
    const initial = initialErEdge(result.edgeType);
    diagram = addEdge(diagram, { id: nextId(), artifactType: result.edgeType, sourceId, targetId, guard: null, ...DEFAULT_EDGE_SHAPE, routing: erEdgeKinds[result.edgeType]?.defaultRouting ?? DEFAULT_EDGE_SHAPE.routing, waypoints, ...initial, label: label ?? initial.label });
  }

  const nodeOf = (id: string) => diagram.nodes.find((node) => node.id === id)!;

  return {
    entity: (label: string, position: Position) => add(E.entity, label, position),
    weakEntity: (label: string, position: Position) => add(E.weakEntity, label, position),
    relationship: (label: string, position: Position) => add(E.relationship, label, position),
    identifying: (label: string, position: Position) => add(E.identifyingRelationship, label, position),
    note: (label: string, position: Position) => add(E.note, label, position),

    /** Atributos de `ownerId`, en fila centrada sobre él (side 'top') o debajo ('bottom'). Devuelve sus ids. */
    attributes(ownerId: string, specs: AttributeSpec[], side: 'top' | 'bottom' = 'top'): string[] {
      const owner = nodeOf(ownerId);
      const size = erNodeKinds[E.attribute]!.defaultSize;
      const total = specs.length * size.width + (specs.length - 1) * ATTRIBUTE_GAP;
      const left = owner.position.x + owner.size.width / 2 - total / 2;
      const y = side === 'top' ? owner.position.y - ATTRIBUTE_DISTANCE - size.height : owner.position.y + owner.size.height + ATTRIBUTE_DISTANCE;
      return specs.map((spec, index) => {
        const [label, kind] = typeof spec === 'string' ? [spec, null] : spec;
        const id = add(kind ? ATTRIBUTE_TYPE[kind] : E.attribute, label, { x: left + index * (size.width + ATTRIBUTE_GAP), y });
        connect(id, ownerId);
        return id;
      });
    },

    /** Une una entidad con una relación, con la cardinalidad (mín,máx) de esa entidad. */
    join: (entityId: string, relationshipId: string, cardinality: string, waypoints?: Position[]) => connect(entityId, relationshipId, cardinality, waypoints),
    /** Une un atributo con su dueño (o con el atributo compuesto del que es parte). */
    own: (attributeId: string, ownerId: string) => connect(attributeId, ownerId),
    anchor: (noteId: string, targetId: string) => connect(noteId, targetId),

    build(info: TemplateInfo): Template {
      return { ...info, diagramType: 'er', diagram: { ...diagram, id: info.id, name: info.name, description: info.description, templateId: info.id } };
    },
  };
}
