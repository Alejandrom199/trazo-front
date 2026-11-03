import { addEdge, addNode, createEmptyDiagram, DEFAULT_EDGE_SHAPE, type Diagram, type Position, type Size, type Template } from '@/core/model';
import { DeploymentArtifact as D } from '../artifactTypes';
import { initialDeploymentEdge, resolveDeploymentConnection } from '../connections';
import { deploymentNodeKinds } from '../nodeKinds';

export type TemplateInfo = Omit<Template, 'diagram' | 'diagramType'>;

/**
 * Ayuda a escribir plantillas de despliegue. Las máquinas van en coordenadas del
 * lienzo; lo que va dentro de algo (un entorno en una máquina, un artefacto en
 * un entorno) va en coordenadas relativas a su contenedor. Cada conexión pasa por
 * la misma regla que usa el editor.
 */
export function createDeploymentTemplateBuilder() {
  let diagram: Diagram = createEmptyDiagram({ diagramType: 'deployment', name: '' }, new Date(0));
  let sequence = 0;
  const nextId = () => `d${++sequence}`;

  function add(artifactType: string, label: string, position: Position, size?: Size, parentId: string | null = null): string {
    const kind = deploymentNodeKinds[artifactType];
    if (!kind) throw new Error(`Artefacto desconocido en plantilla: "${artifactType}".`);
    const id = nextId();
    diagram = addNode(diagram, { id, artifactType, label, position, size: size ?? { ...kind.defaultSize }, parentId, props: { ...kind.defaultProps }, notes: '', locked: false });
    return id;
  }

  return {
    node: (label: string, position: Position, size: Size) => add(D.node, label, position, size),
    device: (label: string, position: Position, size: Size) => add(D.device, label, position, size),
    environment: (label: string, position: Position, size: Size, inside: string) => add(D.executionEnvironment, label, position, size, inside),
    artifact: (label: string, position: Position, inside: string | null = null) => add(D.artifact, label, position, undefined, inside),
    note: (label: string, position: Position) => add(D.note, label, position),

    /** Une dos elementos con el conector que corresponde; `label` es el protocolo de un camino. */
    connect(sourceId: string, targetId: string, label?: string): void {
      const result = resolveDeploymentConnection(diagram, sourceId, targetId);
      if (!result.allowed) throw new Error(`Plantilla inválida (${sourceId} → ${targetId}): ${result.reason}`);
      const initial = initialDeploymentEdge(result.edgeType);
      diagram = addEdge(diagram, {
        id: nextId(),
        artifactType: result.edgeType,
        sourceId,
        targetId,
        guard: null,
        ...DEFAULT_EDGE_SHAPE,
        waypoints: [],
        ...initial,
        label: label ?? initial.label,
      });
    },

    build(info: TemplateInfo): Template {
      return { ...info, diagramType: 'deployment', diagram: { ...diagram, id: info.id, name: info.name, description: info.description, templateId: info.id } };
    },
  };
}
