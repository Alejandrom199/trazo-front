import { addEdge, addNode, createEmptyDiagram, DEFAULT_EDGE_SHAPE, type Diagram, type Position, type Size, type Template } from '@/core/model';
import { PackageArtifact as P } from '../artifactTypes';
import { initialPackageEdge, resolvePackageConnection } from '../connections';
import { packageNodeKinds } from '../nodeKinds';

export type TemplateInfo = Omit<Template, 'diagram' | 'diagramType'>;

interface ConnectOptions {
  /** «import» o «access» en lugar de una dependencia simple. */
  as?: typeof P.packageImport | typeof P.packageAccess;
  label?: string;
  waypoints?: Position[];
}

/**
 * Ayuda a escribir plantillas de paquetes. Lo de primer nivel va en coordenadas
 * del lienzo; lo que va dentro de un paquete, relativo a él. Cada conexión pasa
 * por la misma regla que usa el editor.
 */
export function createPackageTemplateBuilder() {
  let diagram: Diagram = createEmptyDiagram({ diagramType: 'package', name: '' }, new Date(0));
  let sequence = 0;
  const nextId = () => `p${++sequence}`;

  function add(artifactType: string, label: string, position: Position, size?: Size, parentId: string | null = null): string {
    const kind = packageNodeKinds[artifactType];
    if (!kind) throw new Error(`Artefacto desconocido en plantilla: "${artifactType}".`);
    const id = nextId();
    diagram = addNode(diagram, { id, artifactType, label, position, size: size ?? { ...kind.defaultSize }, parentId, props: { ...kind.defaultProps }, notes: '', locked: false });
    return id;
  }

  return {
    pkg: (label: string, position: Position, size: Size, inside: string | null = null) => add(P.package, label, position, size, inside),
    element: (label: string, position: Position, inside: string | null = null, width?: number) => add(P.element, label, position, width ? { width, height: 50 } : undefined, inside),
    note: (label: string, position: Position, size?: Size) => add(P.note, label, position, size),

    connect(sourceId: string, targetId: string, options: ConnectOptions = {}): void {
      const result = resolvePackageConnection(diagram, sourceId, targetId);
      if (!result.allowed) throw new Error(`Plantilla inválida (${sourceId} → ${targetId}): ${result.reason}`);
      const edgeType = result.edgeType === P.dependency && options.as ? options.as : result.edgeType;
      const initial = initialPackageEdge(edgeType);
      diagram = addEdge(diagram, {
        id: nextId(),
        artifactType: edgeType,
        sourceId,
        targetId,
        guard: null,
        ...DEFAULT_EDGE_SHAPE,
        waypoints: options.waypoints ?? [],
        ...initial,
        label: options.label ?? initial.label,
      });
    },

    build(info: TemplateInfo): Template {
      return { ...info, diagramType: 'package', diagram: { ...diagram, id: info.id, name: info.name, description: info.description, templateId: info.id } };
    },
  };
}
