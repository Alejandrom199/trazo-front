import {
  absolutePosition,
  addEdge,
  addNode,
  createEmptyDiagram,
  findContainerAt,
  type Diagram,
  type Position,
  type Size,
  type Template,
} from '@/core/model';
import { ActivityArtifact as A } from '../artifactTypes';
import { resolveActivityConnection } from '../connections';
import { activityNodeKinds } from '../nodeKinds';

export type TemplateInfo = Omit<Template, 'diagram' | 'diagramType'>;

/**
 * Ayuda a escribir plantillas de forma legible: los nodos se ubican por su CENTRO
 * en coordenadas absolutas, entran solos al carril que los contiene, y cada flecha
 * pasa por la misma regla de conexión que usa el editor. Si una plantilla viola
 * una regla UML, falla al cargar en lugar de enseñar algo incorrecto.
 */
export function createTemplateBuilder() {
  let diagram: Diagram = createEmptyDiagram({ diagramType: 'activity', name: '' }, new Date(0));
  let sequence = 0;

  const isLane = (node: { artifactType: string }) => node.artifactType === A.partition;

  function nextId(): string {
    sequence += 1;
    return `n${sequence}`;
  }

  return {
    /** Carril vertical con su esquina superior izquierda en (x, 0). */
    lane(label: string, x: number, width: number, height: number): string {
      const id = nextId();
      diagram = addNode(diagram, {
        id,
        artifactType: A.partition,
        label,
        position: { x, y: 0 },
        size: { width, height },
        parentId: null,
        props: {},
        notes: '',
      });
      return id;
    },

    node(artifactType: string, label: string, center: Position, size?: Size): string {
      const kind = activityNodeKinds[artifactType];
      if (!kind) throw new Error(`Artefacto desconocido en plantilla: "${artifactType}".`);

      const finalSize = size ?? kind.defaultSize;
      const topLeft = { x: center.x - finalSize.width / 2, y: center.y - finalSize.height / 2 };
      const lane = findContainerAt(diagram, center, isLane);
      const origin = lane ? absolutePosition(diagram, lane) : { x: 0, y: 0 };

      const id = nextId();
      diagram = addNode(diagram, {
        id,
        artifactType,
        label,
        position: { x: topLeft.x - origin.x, y: topLeft.y - origin.y },
        size: { ...finalSize },
        parentId: lane?.id ?? null,
        props: { ...kind.defaultProps },
        notes: '',
      });
      return id;
    },

    flow(sourceId: string, targetId: string, guard: string | null = null): void {
      const result = resolveActivityConnection(diagram, sourceId, targetId);
      if (!result.allowed) throw new Error(`Plantilla inválida (${sourceId} → ${targetId}): ${result.reason}`);
      diagram = addEdge(diagram, {
        id: `${sourceId}-${targetId}`,
        artifactType: result.edgeType,
        sourceId,
        targetId,
        guard,
        label: '',
      });
    },

    build(info: TemplateInfo): Template {
      return {
        ...info,
        diagramType: 'activity',
        diagram: { ...diagram, id: info.id, name: info.name, description: info.description, templateId: info.id },
      };
    },
  };
}
