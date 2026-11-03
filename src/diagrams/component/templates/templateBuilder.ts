import { addEdge, addNode, createEmptyDiagram, DEFAULT_EDGE_SHAPE, type Diagram, type Position, type Size, type Template } from '@/core/model';
import { ComponentArtifact as C } from '../artifactTypes';
import { initialComponentEdge, resolveComponentConnection } from '../connections';
import { componentNodeKinds } from '../nodeKinds';

export type TemplateInfo = Omit<Template, 'diagram' | 'diagramType'>;

/** Alto de un componente: su centro queda 45 px por debajo de su borde superior. */
const COMPONENT_HEIGHT = 90;
const INTERFACE_SIZE = 28;

/**
 * Ayuda a escribir plantillas de componentes. Las interfaces se ubican en la fila
 * de un componente (`row` = borde superior de esa fila) para que las líneas salgan
 * rectas; cada conexión pasa por la misma regla que usa el editor.
 */
export function createComponentTemplateBuilder() {
  let diagram: Diagram = createEmptyDiagram({ diagramType: 'component', name: '' }, new Date(0));
  let sequence = 0;
  const nextId = () => `k${++sequence}`;

  function node(artifactType: string, label: string, position: Position, size?: Size, parentId: string | null = null): string {
    const kind = componentNodeKinds[artifactType];
    if (!kind) throw new Error(`Artefacto desconocido en plantilla: "${artifactType}".`);
    const id = nextId();
    diagram = addNode(diagram, { id, artifactType, label, position, size: size ?? { ...kind.defaultSize }, parentId, props: { ...kind.defaultProps }, notes: '', locked: false });
    return id;
  }

  const interfaceAt = (type: string, label: string, x: number, row: number) => node(type, label, { x, y: row + (COMPONENT_HEIGHT - INTERFACE_SIZE) / 2 });

  return {
    component: (label: string, position: Position, parentId: string | null = null) => node(C.component, label, position, undefined, parentId),
    subsystem: (label: string, position: Position, size: Size) => node(C.subsystem, label, position, size),
    provided: (label: string, x: number, row: number) => interfaceAt(C.providedInterface, label, x, row),
    required: (label: string, x: number, row: number) => interfaceAt(C.requiredInterface, label, x, row),
    note: (label: string, position: Position) => node(C.note, label, position),

    /** Une dos elementos con el conector que corresponde (se deduce como en el editor). */
    connect(sourceId: string, targetId: string): void {
      const result = resolveComponentConnection(diagram, sourceId, targetId);
      if (!result.allowed) throw new Error(`Plantilla inválida (${sourceId} → ${targetId}): ${result.reason}`);
      const initial = initialComponentEdge(result.edgeType);
      diagram = addEdge(diagram, { id: nextId(), artifactType: result.edgeType, sourceId, targetId, guard: null, ...DEFAULT_EDGE_SHAPE, routing: 'straight', waypoints: [], ...initial });
    },

    build(info: TemplateInfo): Template {
      return { ...info, diagramType: 'component', diagram: { ...diagram, id: info.id, name: info.name, description: info.description, templateId: info.id } };
    },
  };
}
