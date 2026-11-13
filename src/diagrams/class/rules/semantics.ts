import { nodeName, type Diagram, type ValidationRule } from '@/core/model';
import { ClassArtifact as C } from '../artifactTypes';

/**
 * Reglas de significado del diagrama de clases (no de notación). A propósito no
 * hay regla de «composición circular»: a nivel de clases es legítima (una Carpeta
 * que contiene Carpetas, el patrón Composite); lo que no puede tener ciclos son
 * las instancias, y eso no se ve en un diagrama de clases.
 */

const nameOf = (diagram: Diagram, id: string) => nodeName(diagram.nodes.find((node) => node.id === id));

/**
 * Herencia circular. En una generalización, el origen especializa al destino; la
 * jerarquía debe ser acíclica: una clase no puede ser, a la vez, ancestro de sí misma.
 */
export const generalizationCycle: ValidationRule = {
  id: 'class.generalization-cycle',
  diagramType: 'class',
  severity: 'error',
  title: 'Herencia circular',
  explanation: 'La generalización forma una jerarquía: si A especializa a B, B no puede especializar a A, ni directa ni indirectamente.',
  check: (diagram) => {
    const generalizations = diagram.edges.filter((edge) => edge.artifactType === C.generalization);
    return cyclesOf(generalizations).map((cycle) => {
      const nodeIds = [...new Set(cycle.flatMap((edge) => [edge.sourceId, edge.targetId]))];
      return {
        ruleId: 'class.generalization-cycle',
        severity: 'error',
        message: `Herencia circular entre ${nodeIds.map((id) => `«${nameOf(diagram, id)}»`).join(', ')}.`,
        suggestion: 'Decide cuál es la clase general y quita la generalización que apunta al revés.',
        nodeIds,
        edgeIds: cycle.map((edge) => edge.id),
      };
    });
  },
};

/**
 * Parte de dos composiciones. En la composición el origen es el todo y el destino
 * la parte; una instancia de la parte pertenece a un solo todo a la vez. Es un
 * aviso y no un error: es válido si cada instancia está en uno solo (0..1 en cada lado).
 */
export const sharedCompositePart: ValidationRule = {
  id: 'class.shared-composite-part',
  diagramType: 'class',
  severity: 'warning',
  title: 'Parte de varios todos',
  explanation: 'En una composición, cada instancia de la parte pertenece a un único todo y vive con él. Si una clase es parte de dos composiciones, cada instancia solo puede estar en una.',
  check: (diagram) => {
    const wholesByPart = new Map<string, Set<string>>();
    for (const edge of diagram.edges.filter((candidate) => candidate.artifactType === C.composition)) {
      wholesByPart.set(edge.targetId, (wholesByPart.get(edge.targetId) ?? new Set()).add(edge.sourceId));
    }
    return [...wholesByPart]
      .filter(([, wholes]) => wholes.size > 1)
      .map(([partId, wholes]) => ({
        ruleId: 'class.shared-composite-part',
        severity: 'warning',
        message: `«${nameOf(diagram, partId)}» es parte compuesta de ${[...wholes].map((id) => `«${nameOf(diagram, id)}»`).join(' y ')}.`,
        suggestion: 'Si una misma instancia se comparte, usa agregación o asociación; si no, indica 0..1 del lado de cada todo.',
        nodeIds: [partId, ...wholes],
        edgeIds: diagram.edges
          .filter((edge) => edge.artifactType === C.composition && edge.targetId === partId)
          .map((edge) => edge.id),
      }));
  },
};

type Arrow = { id: string; sourceId: string; targetId: string };

/**
 * Ciclos de un grafo dirigido, uno por componente fuertemente conexa (Tarjan): así
 * un triángulo A→B→C→A es un solo problema y no tres. Incluye bucles A→A.
 */
function cyclesOf(arrows: Arrow[]): Arrow[][] {
  const next = new Map<string, string[]>();
  for (const arrow of arrows) next.set(arrow.sourceId, [...(next.get(arrow.sourceId) ?? []), arrow.targetId]);
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  let counter = 0;

  function visit(nodeId: string): void {
    index.set(nodeId, counter);
    low.set(nodeId, counter);
    counter += 1;
    stack.push(nodeId);
    onStack.add(nodeId);
    for (const target of next.get(nodeId) ?? []) {
      if (!index.has(target)) {
        visit(target);
        low.set(nodeId, Math.min(low.get(nodeId)!, low.get(target)!));
      } else if (onStack.has(target)) {
        low.set(nodeId, Math.min(low.get(nodeId)!, index.get(target)!));
      }
    }
    if (low.get(nodeId) !== index.get(nodeId)) return;
    const component: string[] = [];
    let member: string;
    do {
      member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
    } while (member !== nodeId);
    components.push(component);
  }

  for (const nodeId of next.keys()) if (!index.has(nodeId)) visit(nodeId);

  return components
    .map((component) => {
      const members = new Set(component);
      return arrows.filter((arrow) => members.has(arrow.sourceId) && members.has(arrow.targetId));
    })
    .filter((cycle) => cycle.length > 0);
}
