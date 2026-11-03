import type { Diagram, DiagramEdge, DiagramNode } from '@/core/model';
import { ComponentArtifact as C } from './artifactTypes';

/**
 * Lectura del diagrama de componentes que comparten las reglas y el narrador:
 * qué componente ofrece o necesita cada interfaz, qué ensambles hay y quién
 * depende de quién (directamente o a través de un ensamble).
 */
export interface ComponentModel {
  components: DiagramNode[];
  provided: DiagramNode[];
  required: DiagramNode[];
  /** Componente que ofrece (provided) o necesita (required) cada interfaz. */
  ownerOf: (interfaceId: string) => DiagramNode | undefined;
  /** Ensambles como pares requerida → provista. */
  assemblies: { edge: DiagramEdge; required: DiagramNode; provided: DiagramNode }[];
  /** Dependencias entre componentes: directas («use») o por ensamble (quien necesita → quien ofrece). */
  dependsOn: Map<string, Set<string>>;
}

const otherEnd = (edge: DiagramEdge, id: string) => (edge.sourceId === id ? edge.targetId : edge.sourceId);

export function buildComponentModel(diagram: Diagram): ComponentModel {
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const ofType = (type: string) => diagram.nodes.filter((node) => node.artifactType === type);
  const components = ofType(C.component);
  const provided = ofType(C.providedInterface);
  const required = ofType(C.requiredInterface);

  const owner = new Map<string, DiagramNode>();
  for (const edge of diagram.edges) {
    if (edge.artifactType !== C.provision && edge.artifactType !== C.requirement) continue;
    for (const end of [edge.sourceId, edge.targetId]) {
      const node = byId.get(end);
      const other = byId.get(otherEnd(edge, end));
      if (node && other && node.artifactType !== C.component && other.artifactType === C.component) owner.set(node.id, other);
    }
  }

  const assemblies = diagram.edges.flatMap((edge) => {
    if (edge.artifactType !== C.assembly) return [];
    const ends = [byId.get(edge.sourceId), byId.get(edge.targetId)];
    const requiredEnd = ends.find((node) => node?.artifactType === C.requiredInterface);
    const providedEnd = ends.find((node) => node?.artifactType === C.providedInterface);
    return requiredEnd && providedEnd ? [{ edge, required: requiredEnd, provided: providedEnd }] : [];
  });

  const dependsOn = new Map<string, Set<string>>(components.map((component) => [component.id, new Set<string>()]));
  const link = (from: string | undefined, to: string | undefined) => {
    if (from && to && from !== to) dependsOn.get(from)?.add(to);
  };
  for (const edge of diagram.edges) if (edge.artifactType === C.dependency) link(edge.sourceId, edge.targetId);
  for (const { required: req, provided: prov } of assemblies) link(owner.get(req.id)?.id, owner.get(prov.id)?.id);

  return { components, provided, required, ownerOf: (id) => owner.get(id), assemblies, dependsOn };
}

/** Componentes que forman parte de algún ciclo de dependencias. */
export function componentsInCycles(model: ComponentModel): string[][] {
  const cycles: string[][] = [];
  const seen = new Set<string>();
  for (const start of model.dependsOn.keys()) {
    const stack: string[] = [];
    const visit = (id: string) => {
      if (stack.includes(id)) {
        const cycle = stack.slice(stack.indexOf(id));
        const key = [...cycle].sort().join('|');
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(cycle);
        }
        return;
      }
      stack.push(id);
      for (const next of model.dependsOn.get(id) ?? []) visit(next);
      stack.pop();
    };
    visit(start);
  }
  return cycles;
}

export const nameOf = (node: DiagramNode | undefined) => `«${node?.label.trim() || 'sin nombre'}»`;
