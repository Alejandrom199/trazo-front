import { addEdge, addNode, createEmptyDiagram, DEFAULT_EDGE_SHAPE, type Diagram, type Position, type Size, type Template } from '@/core/model';
import { UseCaseArtifact as U } from '../artifactTypes';
import { resolveUseCaseConnection, initialUseCaseEdge } from '../connections';
import { useCaseNodeKinds } from '../nodeKinds';

type TemplateInfo = Omit<Template, 'diagram' | 'diagramType'>;

export function createUseCaseTemplateBuilder() {
  let diagram: Diagram = createEmptyDiagram({ diagramType: 'usecase', name: '' }, new Date(0));
  let sequence = 0;
  const id = () => `u${++sequence}`;

  function node(artifactType: string, label: string, position: Position, size?: Size, parentId: string | null = null): string {
    const kind = useCaseNodeKinds[artifactType]!;
    const nodeId = id();
    diagram = addNode(diagram, { id: nodeId, artifactType, label, position, size: size ?? kind.defaultSize, parentId, props: { ...kind.defaultProps }, notes: '', locked: false });
    return nodeId;
  }

  return {
    boundary(label: string, position: Position, size: Size = { width: 620, height: 430 }) {
      return node(U.systemBoundary, label, position, size);
    },
    actor(label: string, position: Position, boundaryId: string | null = null) { return node(U.actor, label, position, undefined, boundaryId); },
    useCase(label: string, position: Position, boundaryId: string | null) { return node(U.useCase, label, position, undefined, boundaryId); },
    note(label: string, position: Position) { return node(U.note, label, position); },
    relation(sourceId: string, targetId: string, edgeType?: string) {
      const resolved = resolveUseCaseConnection(diagram, sourceId, targetId);
      if (!resolved.allowed) throw new Error(resolved.reason);
      const finalType = edgeType ?? resolved.edgeType;
      const initial = initialUseCaseEdge(finalType);
      diagram = addEdge(diagram, { id: id(), artifactType: finalType, sourceId, targetId, guard: null, label: initial.label, ...DEFAULT_EDGE_SHAPE, routing: 'straight', props: initial.props });
    },
    build(info: TemplateInfo): Template {
      return { ...info, diagramType: 'usecase', diagram: { ...diagram, id: info.id, name: info.name, description: info.description, templateId: info.id } };
    },
  };
}
