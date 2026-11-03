import { addEdge, addNode, createEmptyDiagram, DEFAULT_EDGE_SHAPE, type Diagram, type Position, type Size, type Template } from '@/core/model';
import { StateArtifact as S } from '../artifactTypes';
import { resolveStateConnection } from '../connections';
import { stateNodeKinds } from '../nodeKinds';

export type TemplateInfo = Omit<Template, 'diagram' | 'diagramType'>;

/**
 * Ayuda a escribir plantillas de máquinas de estados. Lo de primer nivel va en
 * coordenadas del lienzo; lo que va dentro de un estado compuesto, en coordenadas
 * relativas a él. Cada transición pasa por la misma regla que usa el editor.
 */
export function createStateTemplateBuilder() {
  let diagram: Diagram = createEmptyDiagram({ diagramType: 'state', name: '' }, new Date(0));
  let sequence = 0;
  const nextId = () => `s${++sequence}`;

  function add(artifactType: string, label: string, position: Position, size?: Size, parentId: string | null = null): string {
    const kind = stateNodeKinds[artifactType];
    if (!kind) throw new Error(`Artefacto desconocido en plantilla: "${artifactType}".`);
    const id = nextId();
    diagram = addNode(diagram, { id, artifactType, label, position, size: size ?? { ...kind.defaultSize }, parentId, props: { ...kind.defaultProps }, notes: '', locked: false });
    return id;
  }

  return {
    state: (label: string, position: Position, inside: string | null = null, size?: Size) => add(S.state, label, position, size, inside),
    composite: (label: string, position: Position, size: Size, inside: string | null = null) => add(S.compositeState, label, position, size, inside),
    initial: (position: Position, inside: string | null = null) => add(S.initial, '', position, undefined, inside),
    final: (position: Position, inside: string | null = null) => add(S.final, '', position, undefined, inside),
    choice: (position: Position, inside: string | null = null) => add(S.choice, '', position, undefined, inside),
    history: (position: Position, inside: string) => add(S.history, '', position, undefined, inside),
    note: (label: string, position: Position) => add(S.note, label, position),

    /** Une dos elementos; `label` es «evento [guarda] / efecto» y `waypoints` rodea lo que haga falta. */
    connect(sourceId: string, targetId: string, label = '', waypoints: Position[] = []): void {
      const result = resolveStateConnection(diagram, sourceId, targetId);
      if (!result.allowed) throw new Error(`Plantilla inválida (${sourceId} → ${targetId}): ${result.reason}`);
      diagram = addEdge(diagram, { id: nextId(), artifactType: result.edgeType, sourceId, targetId, guard: null, ...DEFAULT_EDGE_SHAPE, waypoints, label, props: {} });
    },

    build(info: TemplateInfo): Template {
      return { ...info, diagramType: 'state', diagram: { ...diagram, id: info.id, name: info.name, description: info.description, templateId: info.id } };
    },
  };
}
