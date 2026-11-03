import { useEffect } from 'react';
import { moveInLayers, placeRelativeTo, type DiagramNode, type LayerMove } from '@/core/model';
import type { DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { drawOrder } from './adapters';

/**
 * Capas: traer al frente, adelante, atrás y enviar al fondo. Solo se reordena
 * entre hermanos (mismo contenedor y misma capa de dibujo), así un hijo nunca
 * queda detrás de su contenedor.
 */

const store = () => useDiagramStore.getState();

/** Clave de «hermanos»: mismo contenedor y misma capa de dibujo (ver drawOrder). */
export function layerGroup(module: DiagramModule): (node: DiagramNode) => string {
  const diagram = store().diagram;
  return (node) => `${node.parentId ?? ''}|${drawOrder(node, module, diagram ?? undefined)}`;
}

export function moveLayers(module: DiagramModule, move: LayerMove, nodeIds: string[] = store().selection.nodeIds): void {
  if (nodeIds.length === 0) return;
  const groupOf = layerGroup(module);
  store().reorderNodes((nodes) => moveInLayers(nodes, new Set(nodeIds), move, groupOf));
}

/** Pone un nodo justo delante o detrás de otro hermano (arrastrar en el panel de capas). */
export function placeLayer(module: DiagramModule, movedId: string, targetId: string, inFront: boolean): void {
  const groupOf = layerGroup(module);
  store().reorderNodes((nodes) => placeRelativeTo(nodes, movedId, targetId, inFront, groupOf));
}

/** Atajos de cada movimiento, para mostrarlos en menús y botones. */
export const LAYER_SHORTCUTS: Record<LayerMove, string> = {
  front: 'Ctrl+Shift+↑',
  forward: 'Ctrl+↑',
  backward: 'Ctrl+↓',
  back: 'Ctrl+Shift+↓',
};

/**
 * Ctrl+↑ / Ctrl+↓ (con Shift: al frente / al fondo), como en Google Slides; y
 * Ctrl+] / Ctrl+[ como en Figma, para teclados donde esas teclas son directas.
 */
export function useLayerShortcuts(module: DiagramModule | null | undefined) {
  useEffect(() => {
    if (!module) return;
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const up = event.key === 'ArrowUp' || event.key === ']' || event.key === '}';
      const down = event.key === 'ArrowDown' || event.key === '[' || event.key === '{';
      if (!up && !down) return;
      if (store().selection.nodeIds.length === 0) return;
      event.preventDefault();
      // Que React Flow no mueva además los nodos con la flecha.
      event.stopImmediatePropagation();
      moveLayers(module!, up ? (event.shiftKey ? 'front' : 'forward') : event.shiftKey ? 'back' : 'backward');
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [module]);
}
