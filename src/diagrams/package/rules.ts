import type { Diagram, DiagramEdge, DiagramNode, ValidationIssue, ValidationRule } from '@/core/model';
import { DEPENDENCY_TYPES, PackageArtifact as P } from './artifactTypes';

type RuleMeta = Omit<ValidationRule, 'diagramType' | 'check'>;
type Found = Omit<ValidationIssue, 'ruleId' | 'severity' | 'nodeIds' | 'edgeIds'> & { nodeIds?: string[]; edgeIds?: string[] };

/** Crea una regla: describe lo que encontró; id y gravedad los pone este envoltorio. */
function rule(meta: RuleMeta, find: (diagram: Diagram) => Found[]): ValidationRule {
  return {
    ...meta,
    diagramType: 'package',
    check: (diagram) =>
      diagram.nodes.length === 0 ? [] : find(diagram).map((found) => ({ ruleId: meta.id, severity: meta.severity, nodeIds: [], edgeIds: [], ...found })),
  };
}

const name = (node: DiagramNode | undefined) => `«${node?.label.trim() || 'sin nombre'}»`;
const isDependency = (edge: DiagramEdge) => DEPENDENCY_TYPES.includes(edge.artifactType);

/** El paquete al que pertenece un nodo (él mismo si es un paquete); si no tiene, el propio nodo. */
export function ownerOf(diagram: Diagram, node: DiagramNode): DiagramNode {
  if (node.artifactType === P.package) return node;
  let current = diagram.nodes.find((candidate) => candidate.id === node.parentId);
  while (current && current.artifactType !== P.package) current = diagram.nodes.find((candidate) => candidate.id === current!.parentId);
  return current ?? node;
}

/**
 * Grupos de paquetes que dependen unos de otros en círculo (componentes fuertemente
 * conexos de más de uno, algoritmo de Tarjan). Las dependencias entre elementos
 * cuentan como dependencias entre sus paquetes.
 */
export function dependencyCycles(diagram: Diagram): { nodeIds: string[]; edgeIds: string[] }[] {
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const lifted = diagram.edges.filter(isDependency).flatMap((edge) => {
    const source = byId.get(edge.sourceId);
    const target = byId.get(edge.targetId);
    if (!source || !target) return [];
    const from = ownerOf(diagram, source).id;
    const to = ownerOf(diagram, target).id;
    return from === to ? [] : [{ from, to, edge }];
  });
  const next = new Map<string, string[]>();
  for (const { from, to } of lifted) next.set(from, [...(next.get(from) ?? []), to]);

  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const groups: string[][] = [];
  const visit = (id: string) => {
    index.set(id, index.size);
    low.set(id, index.get(id)!);
    stack.push(id);
    onStack.add(id);
    for (const to of next.get(id) ?? []) {
      if (!index.has(to)) {
        visit(to);
        low.set(id, Math.min(low.get(id)!, low.get(to)!));
      } else if (onStack.has(to)) low.set(id, Math.min(low.get(id)!, index.get(to)!));
    }
    if (low.get(id) === index.get(id)) {
      const group: string[] = [];
      let member: string;
      do {
        member = stack.pop()!;
        onStack.delete(member);
        group.push(member);
      } while (member !== id);
      if (group.length > 1) groups.push(group);
    }
  };
  for (const id of next.keys()) if (!index.has(id)) visit(id);

  return groups.map((group) => ({
    nodeIds: group,
    edgeIds: lifted.filter(({ from, to }) => group.includes(from) && group.includes(to)).map(({ edge }) => edge.id),
  }));
}

/** Regla: las dependencias entre paquetes no forman ciclos. */
const cycle = rule(
  {
    id: 'package.cycle',
    severity: 'warning',
    title: 'Dependencias en círculo',
    explanation: 'Si A depende de B y B de A, no se puede cambiar, probar ni entregar uno sin el otro: en la práctica son un solo paquete.',
  },
  (diagram) =>
    dependencyCycles(diagram).map(({ nodeIds, edgeIds }) => ({
      message: `${nodeIds.map((id) => name(diagram.nodes.find((node) => node.id === id))).join(', ')} dependen unos de otros en círculo.`,
      suggestion: 'Invierte una de las dependencias con una interfaz en un paquete aparte, o une los paquetes si de verdad son uno.',
      nodeIds,
      edgeIds,
    })),
);

/** Regla: todo paquete y elemento tiene nombre. */
const unnamed = rule(
  { id: 'package.unnamed', severity: 'warning', title: 'Sin nombre', explanation: 'Un paquete es un espacio de nombres: sin nombre no se puede referenciar.' },
  (diagram) =>
    diagram.nodes
      .filter((node) => node.artifactType !== P.note && !node.label.trim())
      .map((node) => ({ message: 'Hay un paquete o elemento sin nombre.', suggestion: 'Haz doble clic y nómbralo con un sustantivo: «Pedidos», «Facturación».', nodeIds: [node.id] })),
);

/** Regla (informativa): un paquete vacío y sin relaciones no aporta. */
const emptyPackage = rule(
  { id: 'package.empty', severity: 'info', title: 'Paquete vacío', explanation: 'Un paquete sin contenido ni dependencias todavía no dice nada de la arquitectura.' },
  (diagram) =>
    diagram.nodes
      .filter(
        (node) =>
          node.artifactType === P.package &&
          !diagram.nodes.some((child) => child.parentId === node.id) &&
          !diagram.edges.some((edge) => isDependency(edge) && (edge.sourceId === node.id || edge.targetId === node.id)),
      )
      .map((node) => ({ message: `${name(node)} está vacío y no se relaciona con nada.`, suggestion: 'Arrastra dentro sus clases o subpaquetes, o únelo con las dependencias que tenga.', nodeIds: [node.id] })),
);

/** Regla (informativa): cada elemento pertenece a algún paquete. */
const looseElement = rule(
  { id: 'package.loose-element', severity: 'info', title: 'Elemento fuera de paquete', explanation: 'En un diagrama de paquetes cada elemento pertenece a uno: suelto, no se sabe de qué parte del sistema es.' },
  (diagram) =>
    diagram.nodes.some((node) => node.artifactType === P.package)
      ? diagram.nodes
          .filter((node) => node.artifactType === P.element && ownerOf(diagram, node) === node)
          .map((node) => ({ message: `${name(node)} no está dentro de ningún paquete.`, suggestion: 'Arrástralo dentro del paquete al que pertenece.', nodeIds: [node.id] }))
      : [],
);

/** Regla (informativa): toda nota se ancla a algo. */
const noteLoose = rule(
  { id: 'package.note-loose', severity: 'info', title: 'Nota sin anclar', explanation: 'Una nota suelta puede leerse como comentario de cualquier elemento.' },
  (diagram) =>
    diagram.nodes
      .filter((node) => node.artifactType === P.note && !diagram.edges.some((edge) => edge.artifactType === P.annotationLink && (edge.sourceId === node.id || edge.targetId === node.id)))
      .map((node) => ({ message: 'Hay una nota sin anclar.', suggestion: 'Únela al elemento que comenta.', nodeIds: [node.id] })),
);

/** Todas las reglas, en el orden en que conviene leerlas. */
export const packageRules: ValidationRule[] = [cycle, unnamed, looseElement, emptyPackage, noteLoose];
