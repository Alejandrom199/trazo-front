import { nodeName, type Diagram, type TraceEndpoint } from '@/core/model';
import { diagramRegistry } from '@/core/registry';
import { openProjectElements } from '@/ui/projects/openProjectElements';
import { openSavedDiagram } from '@/ui/projects/projectActions';

export interface ElementOption {
  id: string;
  kind: 'node' | 'edge';
  label: string;
}

/** Nombre del tipo de artefacto, para elementos sin nombre propio. */
function artifactName(diagram: Diagram, artifactType: string): string | undefined {
  if (!diagramRegistry.has(diagram.diagramType)) return undefined;
  return diagramRegistry.get(diagram.diagramType).artifacts.find((item) => item.type === artifactType)?.name;
}

/** Elementos de un diagrama con un nombre legible (los sin nombre, por su tipo). */
export function elementOptions(diagram: Diagram): ElementOption[] {
  return [
    ...diagram.nodes.map((node) => ({ id: node.id, kind: 'node' as const, label: nodeName(node, '') || artifactName(diagram, node.artifactType) || 'Nodo sin nombre' })),
    ...diagram.edges.map((edge) => ({ id: edge.id, kind: 'edge' as const, label: edge.label.trim() || edge.guard || artifactName(diagram, edge.artifactType) || 'Conexión' })),
  ];
}

/** «Diagrama › elemento», o solo el diagrama si `elementId` es null. */
export function targetLabel(diagrams: readonly Diagram[], diagramId: string, elementId: string | null): string {
  const diagram = diagrams.find((item) => item.id === diagramId);
  if (!diagram) return 'Diagrama que ya no está';
  if (elementId === null) return diagram.name;
  const element = elementOptions(diagram).find((item) => item.id === elementId);
  return `${diagram.name} › ${element?.label ?? 'elemento que ya no existe'}`;
}

/** Abre el diagrama y, si se indica, selecciona el elemento. */
export function openTarget(diagrams: readonly Diagram[], diagramId: string, elementId: string | null): void {
  const diagram = diagrams.find((item) => item.id === diagramId);
  if (!diagram) return;
  if (elementId === null) {
    openSavedDiagram(diagramId);
    return;
  }
  const kind = diagram.edges.some((edge) => edge.id === elementId) ? 'edge' : 'node';
  const endpoint: TraceEndpoint = { diagramId, elementId, kind };
  openProjectElements([endpoint], diagrams);
}
