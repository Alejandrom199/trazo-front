import { addEdge, addNode, createEmptyDiagram, DEFAULT_EDGE_SHAPE, EDGE_OFFSET_KEY, type Diagram, type Template } from '@/core/model';
import { SequenceArtifact as S } from '../artifactTypes';
import { resolveSequenceConnection } from '../connections';
import { fragmentDivider } from '../nodes/SequenceShapes';
import { sequenceNodeKinds } from '../nodeKinds';

export type TemplateInfo = Omit<Template, 'diagram' | 'diagramType'>;

/** Ancho de cada participante en las plantillas: su línea central queda en x + 60. */
const PARTICIPANT_WIDTH = 120;

/**
 * Ayuda a escribir plantillas de secuencia de forma legible. Las alturas (y) se
 * dan desde la fila de cabeceras (y = 0), que es donde están todos los
 * participantes; cada mensaje pasa por la misma regla de conexión que usa el
 * editor. Si una plantilla viola una regla, falla al cargar en lugar de enseñar
 * algo incorrecto.
 */
export function createSequenceTemplateBuilder() {
  let diagram: Diagram = createEmptyDiagram({ diagramType: 'sequence', name: '' }, new Date(0));
  let sequence = 0;

  function nextId(): string {
    sequence += 1;
    return `s${sequence}`;
  }

  function add(artifactType: string, label: string, position: { x: number; y: number }, size: { width: number; height: number }, parentId: string | null = null, props: Record<string, unknown> = {}): string {
    const kind = sequenceNodeKinds[artifactType];
    if (!kind) throw new Error(`Artefacto desconocido en plantilla: "${artifactType}".`);
    const id = nextId();
    diagram = addNode(diagram, { id, artifactType, label, position, size, parentId, props: { ...kind.defaultProps, ...props }, notes: '', locked: false });
    return id;
  }

  /** Centra un elemento de ancho `width` sobre la línea de vida. */
  const onLine = (width: number) => (PARTICIPANT_WIDTH - width) / 2;

  return {
    /** Participante (línea de vida o actor) con su esquina superior izquierda en (x, 0). */
    participant(artifactType: typeof S.lifeline | typeof S.actor, label: string, x: number, height: number, props: Record<string, unknown> = {}): string {
      return add(artifactType, label, { x, y: 0 }, { width: PARTICIPANT_WIDTH, height }, null, props);
    },

    /** Barra de activación sobre la línea de vida, de la altura `from` a la `to`. */
    activation(lifelineId: string, from: number, to: number): string {
      const width = sequenceNodeKinds[S.activation]!.defaultSize.width;
      return add(S.activation, '', { x: onLine(width), y: from }, { width, height: to - from }, lifelineId);
    },

    /** Destrucción (X) sobre la línea de vida, centrada en la altura `y`. */
    destruction(lifelineId: string, y: number): string {
      const size = sequenceNodeKinds[S.destruction]!.defaultSize;
      return add(S.destruction, '', { x: onLine(size.width), y: y - size.height / 2 }, { ...size }, lifelineId);
    },

    /** Mensaje del tipo dado a la altura `y`. */
    message(artifactType: string, sourceId: string, targetId: string, label: string, y: number, props: Record<string, unknown> = {}): void {
      const result = resolveSequenceConnection(diagram, sourceId, targetId);
      if (!result.allowed) throw new Error(`Plantilla inválida (${sourceId} → ${targetId}): ${result.reason}`);
      diagram = addEdge(diagram, {
        id: `${sourceId}-${targetId}-${y}`,
        artifactType,
        sourceId,
        targetId,
        guard: null,
        label,
        ...DEFAULT_EDGE_SHAPE,
        waypoints: [],
        props: { [EDGE_OFFSET_KEY]: y, ...props },
      });
    },

    /** Fragmento combinado; `divider` (alt, par) es la altura absoluta de la línea que separa sus regiones. */
    fragment(artifactType: string, guard: string, area: { x: number; y: number; width: number; height: number }, divider?: number, extraProps: Record<string, unknown> = {}): string {
      const props = { ...extraProps, ...(divider === undefined ? {} : { [fragmentDivider.key]: Math.round(((divider - area.y) / area.height) * 100) }) };
      return add(artifactType, guard, { x: area.x, y: area.y }, { width: area.width, height: area.height }, null, props);
    },

    /** Nota anclada a un elemento. */
    note(label: string, area: { x: number; y: number; width: number; height: number }, anchoredTo: string): void {
      const noteId = add(S.note, label, { x: area.x, y: area.y }, { width: area.width, height: area.height });
      const result = resolveSequenceConnection(diagram, noteId, anchoredTo);
      if (!result.allowed) throw new Error(`Plantilla inválida (nota → ${anchoredTo}): ${result.reason}`);
      diagram = addEdge(diagram, {
        id: `${noteId}-${anchoredTo}`,
        artifactType: result.edgeType,
        sourceId: noteId,
        targetId: anchoredTo,
        guard: null,
        label: '',
        ...DEFAULT_EDGE_SHAPE,
        routing: 'straight',
        waypoints: [],
        props: {},
      });
    },

    build(info: TemplateInfo): Template {
      return {
        ...info,
        diagramType: 'sequence',
        diagram: { ...diagram, id: info.id, name: info.name, description: info.description, templateId: info.id },
      };
    },
  };
}
