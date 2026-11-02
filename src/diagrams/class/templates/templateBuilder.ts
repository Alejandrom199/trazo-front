import { addEdge, addNode, createEmptyDiagram, DEFAULT_EDGE_SHAPE, type Diagram, type Position, type Size, type Template } from '@/core/model';
import { ClassArtifact as C } from '../artifactTypes';
import { resolveClassConnection } from '../connections';
import { classNodeKinds } from '../nodeKinds';

type Info = Omit<Template, 'diagram' | 'diagramType'>;
export function createClassTemplateBuilder() {
  let diagram: Diagram = createEmptyDiagram({ diagramType: 'class', name: '' }, new Date(0)); let seq = 0; const id = () => `c${++seq}`;
  const node = (artifactType: string, label: string, position: Position, size?: Size, parentId: string | null = null) => { const kind = classNodeKinds[artifactType]!; const nodeId = id(); diagram = addNode(diagram, { id: nodeId, artifactType, label, position, size: size ?? kind.defaultSize, parentId, props: { ...kind.defaultProps }, notes: '', locked: false }); return nodeId; };
  return {
    classifier: (artifactType: string, label: string, position: Position, parentId: string | null = null) => node(artifactType, label, position, undefined, parentId),
    package: (label: string, position: Position, size: Size) => node(C.package, label, position, size),
    note: (label: string, position: Position) => node(C.note, label, position),
    relation(sourceId: string, targetId: string, artifactType: string = C.association, label = '') { const result = resolveClassConnection(diagram, sourceId, targetId); if (!result.allowed) throw new Error(result.reason); diagram = addEdge(diagram, { id: id(), artifactType, sourceId, targetId, guard: null, label, ...DEFAULT_EDGE_SHAPE, routing: 'straight', props: {} }); },
    build(info: Info): Template { return { ...info, diagramType: 'class', diagram: { ...diagram, id: info.id, name: info.name, description: info.description, templateId: info.id } }; },
  };
}
