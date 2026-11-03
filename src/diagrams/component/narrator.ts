import type { Diagram, Narration, NarrationKind } from '@/core/model';
import { ComponentArtifact as C } from './artifactTypes';
import { buildComponentModel, nameOf } from './componentModel';

/**
 * Narrador del diagrama de componentes: presenta las piezas (y cómo se agrupan),
 * cuenta qué ofrece y qué necesita cada una, quién cubre cada necesidad y las
 * dependencias directas; al final avisa de lo que queda sin cubrir.
 */
export function narrateComponents(diagram: Diagram): Narration {
  if (diagram.nodes.length === 0) return [];
  const model = buildComponentModel(diagram);
  const lines: Narration = [];
  const say = (text: string, kind: NarrationKind, nodeIds: string[] = [], edgeIds: string[] = [], depth = 0) => lines.push({ text, kind, depth, nodeIds, edgeIds });
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));

  say(`El sistema se divide en ${model.components.length} ${model.components.length === 1 ? 'componente' : 'componentes'}: ${list(model.components.map(nameOf))}.`, 'start', model.components.map((node) => node.id));

  for (const subsystem of diagram.nodes.filter((node) => node.artifactType === C.subsystem)) {
    const inside = model.components.filter((component) => component.parentId === subsystem.id);
    if (inside.length > 0) say(`El subsistema ${nameOf(subsystem)} agrupa ${list(inside.map(nameOf))}.`, 'participants', [subsystem.id, ...inside.map((node) => node.id)]);
  }

  for (const component of model.components) {
    const offers = model.provided.filter((node) => model.ownerOf(node.id)?.id === component.id);
    const needs = model.required.filter((node) => model.ownerOf(node.id)?.id === component.id);
    if (offers.length > 0) say(`${nameOf(component)} ofrece ${list(offers.map(nameOf))}.`, 'step', [component.id, ...offers.map((node) => node.id)]);
    if (needs.length > 0) say(`${nameOf(component)} necesita ${list(needs.map(nameOf))}.`, 'step', [component.id, ...needs.map((node) => node.id)], [], offers.length > 0 ? 1 : 0);
  }

  for (const { edge, required, provided } of model.assemblies) {
    const consumer = model.ownerOf(required.id);
    const supplier = model.ownerOf(provided.id);
    say(`${nameOf(consumer)} obtiene ${nameOf(required)} de ${nameOf(supplier)}.`, 'merge', [required.id, provided.id, ...[consumer, supplier].flatMap((node) => (node ? [node.id] : []))], [edge.id]);
  }

  for (const edge of diagram.edges.filter((candidate) => candidate.artifactType === C.dependency)) {
    say(`${nameOf(byId.get(edge.sourceId))} depende directamente de ${nameOf(byId.get(edge.targetId))}.`, 'step', [edge.sourceId, edge.targetId], [edge.id]);
  }

  for (const node of model.required.filter((candidate) => !model.assemblies.some((assembly) => assembly.required.id === candidate.id))) {
    say(`Nadie cubre todavía ${nameOf(node)}.`, 'warning', [node.id]);
  }
  return lines;
}

function list(items: string[]): string {
  if (items.length < 2) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}
