import type { Diagram, DiagramEdge, EdgePatch } from '@/core/model';
import type { DiagramModule } from '@/core/registry';

/**
 * Cambia el tipo de una conexión y, si el texto era un estereotipo (o estaba
 * vacío), pone el del tipo nuevo («use», «implements», «include»…). Conserva
 * multiplicidades y nombres que el usuario haya escrito a mano.
 */
export function edgeTypeChangePatch(
  module: DiagramModule,
  diagram: Diagram,
  edge: DiagramEdge,
  edgeType: string,
): EdgePatch {
  const initial = module.initialEdge?.(diagram, edgeType, edge.sourceId, edge.targetId) ?? { label: '', props: {} };
  const patch: EdgePatch = { artifactType: edgeType, lineStyle: null };
  if (!edge.label.trim() || isStereotypeLabel(edge.label)) {
    patch.label = initial.label;
  }
  return patch;
}

/** «use», «include», «implements»… guillemets UML de estereotipo. */
export function isStereotypeLabel(label: string): boolean {
  return /^«[^»]+»$/.test(label.trim());
}
