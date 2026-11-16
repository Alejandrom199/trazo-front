import {
  absolutePosition,
  addEdge,
  addNode,
  createEmptyDiagram,
  DEFAULT_EDGE_SHAPE,
  findContainerAt,
  type Diagram,
  type Position,
  type Size,
  type Template,
} from '@/core/model';
import { ActivityArtifact as A } from '../artifactTypes';
import { resolveActivityConnection } from '../connections';
import { activityNodeKinds } from '../nodeKinds';
import { ACTIVITY_FRAME_HEADER } from '../nodes/GroupingNodes';

export type TemplateInfo = Omit<Template, 'diagram' | 'diagramType'>;

/**
 * Ayuda a escribir plantillas de forma legible: los nodos se ubican por su CENTRO
 * en coordenadas absolutas, entran solos al carril que los contiene, y cada flecha
 * pasa por la misma regla de conexión que usa el editor. Si una plantilla viola
 * una regla UML, falla al cargar en lugar de enseñar algo incorrecto.
 *
 * Con `frame(...)` al principio, los carriles van dentro de un marco de actividad
 * con ese nombre: las coordenadas se siguen escribiendo desde el borde superior
 * de los carriles, y el marco se ajusta solo a ellos al construir.
 */
export function createTemplateBuilder() {
  let diagram: Diagram = createEmptyDiagram({ diagramType: 'activity', name: '' }, new Date(0));
  let sequence = 0;

  const isLane = (node: { artifactType: string }) => node.artifactType === A.partition;
  let frameId: string | null = null;
  /** Desplazamiento vertical de todo lo que va bajo el título del marco. */
  const offsetY = () => (frameId ? ACTIVITY_FRAME_HEADER : 0);

  function nextId(): string {
    sequence += 1;
    return `n${sequence}`;
  }

  return {
    /** Marco de actividad con su nombre; los carriles que se agreguen después van dentro. */
    frame(label: string): string {
      const id = nextId();
      const kind = activityNodeKinds[A.activityFrame]!;
      diagram = addNode(diagram, { id, artifactType: A.activityFrame, label, position: { x: 0, y: 0 }, size: { ...kind.defaultSize }, parentId: null, props: { ...kind.defaultProps }, notes: '', locked: false });
      frameId = id;
      return id;
    },

    /** Carril vertical con su esquina superior izquierda en (x, 0) (bajo el título, si hay marco). */
    lane(label: string, x: number, width: number, height: number): string {
      const id = nextId();
      diagram = addNode(diagram, {
        id,
        artifactType: A.partition,
        label,
        position: { x, y: offsetY() },
        size: { width, height },
        parentId: frameId,
        props: {},
        notes: '',
        locked: false,
      });
      return id;
    },

    node(artifactType: string, label: string, center: Position, size?: Size, props: Record<string, unknown> = {}): string {
      const kind = activityNodeKinds[artifactType];
      if (!kind) throw new Error(`Artefacto desconocido en plantilla: "${artifactType}".`);

      const finalSize = size ?? kind.defaultSize;
      const at = { x: center.x, y: center.y + offsetY() };
      const topLeft = { x: at.x - finalSize.width / 2, y: at.y - finalSize.height / 2 };
      const lane = findContainerAt(diagram, at, isLane);
      const origin = lane ? absolutePosition(diagram, lane) : { x: 0, y: 0 };

      const id = nextId();
      diagram = addNode(diagram, {
        id,
        artifactType,
        label,
        position: { x: topLeft.x - origin.x, y: topLeft.y - origin.y },
        size: { ...finalSize },
        parentId: lane?.id ?? null,
        props: { ...kind.defaultProps, ...props },
        notes: '',
        locked: false,
      });
      return id;
    },

    flow(sourceId: string, targetId: string, guard: string | null = null, props: Record<string, unknown> = {}): void {
      const result = resolveActivityConnection(diagram, sourceId, targetId);
      if (!result.allowed) throw new Error(`Plantilla inválida (${sourceId} → ${targetId}): ${result.reason}`);
      diagram = addEdge(diagram, {
        id: `${sourceId}-${targetId}`,
        artifactType: result.edgeType,
        sourceId,
        targetId,
        guard,
        label: '',
        ...DEFAULT_EDGE_SHAPE,
        waypoints: [],
        props,
      });
    },

    build(info: TemplateInfo): Template {
      if (frameId) {
        // El marco abarca justo sus carriles: su ancho total y su alto más el título.
        const lanes = diagram.nodes.filter((node) => node.parentId === frameId);
        const width = Math.max(...lanes.map((lane) => lane.position.x + lane.size.width));
        const height = ACTIVITY_FRAME_HEADER + Math.max(...lanes.map((lane) => lane.size.height));
        diagram = { ...diagram, nodes: diagram.nodes.map((node) => (node.id === frameId ? { ...node, size: { width, height } } : node)) };
      }
      return {
        ...info,
        diagramType: 'activity',
        diagram: { ...diagram, id: info.id, name: info.name, description: info.description, templateId: info.id },
      };
    },
  };
}
