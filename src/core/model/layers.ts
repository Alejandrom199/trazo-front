import type { DiagramNode } from './diagram';

/**
 * Orden de capas (qué se dibuja delante de qué). El orden es el de diagram.nodes:
 * lo que va después se dibuja encima. Solo se reordena entre «hermanos» — mismo
 * contenedor y misma capa base (marcos de fondo, contenedores, el resto) — porque
 * un hijo siempre va delante de su contenedor y un marco de fondo, detrás de todo.
 * `groupOf` da esa clave de hermanos (la decide el lienzo, que conoce los tipos).
 */

export type LayerMove = 'front' | 'forward' | 'backward' | 'back';

type GroupOf = (node: DiagramNode) => string;

/** Aplica un movimiento de capas a los nodos elegidos, dentro de cada grupo de hermanos. */
export function moveInLayers(nodes: DiagramNode[], ids: ReadonlySet<string>, move: LayerMove, groupOf: GroupOf): DiagramNode[] {
  return regroup(nodes, groupOf, (members) => {
    const chosen = (node: DiagramNode) => ids.has(node.id);
    if (!members.some(chosen)) return members;
    const next = [...members];
    switch (move) {
      case 'front':
        return [...next.filter((node) => !chosen(node)), ...next.filter(chosen)];
      case 'back':
        return [...next.filter(chosen), ...next.filter((node) => !chosen(node))];
      case 'forward':
        // De atrás hacia adelante: cada elegido sube un puesto sobre el siguiente no elegido.
        for (let i = next.length - 2; i >= 0; i -= 1) {
          if (chosen(next[i]!) && !chosen(next[i + 1]!)) [next[i], next[i + 1]] = [next[i + 1]!, next[i]!];
        }
        return next;
      case 'backward':
        for (let i = 1; i < next.length; i += 1) {
          if (chosen(next[i]!) && !chosen(next[i - 1]!)) [next[i], next[i - 1]] = [next[i - 1]!, next[i]!];
        }
        return next;
    }
  });
}

/**
 * Coloca un nodo justo delante (`inFront`) o detrás de otro de su mismo grupo
 * (p. ej. al soltar una fila en el panel de capas). Si no son hermanos, no cambia nada.
 */
export function placeRelativeTo(nodes: DiagramNode[], movedId: string, targetId: string, inFront: boolean, groupOf: GroupOf): DiagramNode[] {
  const moved = nodes.find((node) => node.id === movedId);
  const target = nodes.find((node) => node.id === targetId);
  if (!moved || !target || moved === target || groupOf(moved) !== groupOf(target)) return nodes;
  return regroup(nodes, groupOf, (members) => {
    if (!members.includes(moved)) return members;
    const without = members.filter((node) => node !== moved);
    const at = without.indexOf(target) + (inFront ? 1 : 0);
    return [...without.slice(0, at), moved, ...without.slice(at)];
  });
}

/** Reordena cada grupo de hermanos por separado y devuelve cada nodo a un hueco de su grupo. */
function regroup(nodes: DiagramNode[], groupOf: GroupOf, reorder: (members: DiagramNode[]) => DiagramNode[]): DiagramNode[] {
  const groups = new Map<string, DiagramNode[]>();
  for (const node of nodes) groups.set(groupOf(node), [...(groups.get(groupOf(node)) ?? []), node]);
  const reordered = new Map([...groups].map(([key, members]) => [key, reorder(members)]));
  const cursor = new Map<string, number>();
  const result = nodes.map((node) => {
    const key = groupOf(node);
    const index = cursor.get(key) ?? 0;
    cursor.set(key, index + 1);
    return reordered.get(key)![index]!;
  });
  return result.every((node, index) => node === nodes[index]) ? nodes : result;
}
