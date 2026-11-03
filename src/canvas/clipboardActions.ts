import { useEffect } from 'react';
import { copySelection, pasteClipboard, type Clipboard, type ElementIds } from '@/core/model';
import type { DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { createId } from '@/core/utils/id';

/**
 * Copiar, cortar, pegar y duplicar en el lienzo. Lo copiado vive en memoria
 * mientras la app está abierta y solo se pega en un diagrama del mismo tipo.
 */

/** Cuánto se corre cada pegado respecto del anterior. */
const PASTE_STEP = 24;

let clipboard: Clipboard | null = null;
/** Pegados seguidos de la misma copia: cada uno se corre un paso más. */
let pasteCount = 0;

const store = () => useDiagramStore.getState();

export function copy(selection: ElementIds = store().selection): boolean {
  const diagram = store().diagram;
  const copied = diagram ? copySelection(diagram, selection) : null;
  if (!copied) return false;
  clipboard = copied;
  pasteCount = 0;
  return true;
}

export function cut(): void {
  const { selection } = store();
  if (copy(selection)) store().removeElements(selection);
}

export function paste(module: DiagramModule): void {
  const diagram = store().diagram;
  if (!diagram || !clipboard || clipboard.diagramType !== diagram.diagramType) return;
  pasteCount += 1;
  insert(module, clipboard, PASTE_STEP * pasteCount);
}

/** Duplica la selección (o los elementos dados) sin tocar lo copiado. */
export function duplicate(module: DiagramModule, selection: ElementIds = store().selection): void {
  const diagram = store().diagram;
  const copied = diagram ? copySelection(diagram, selection) : null;
  if (copied) insert(module, copied, PASTE_STEP);
}

function insert(module: DiagramModule, from: Clipboard, distance: number): void {
  const diagram = store().diagram;
  if (!diagram) return;
  const { nodes, edges } = pasteClipboard(diagram, from, {
    offset: { x: distance, y: distance },
    createId,
    // Los participantes de una secuencia comparten fila: la copia solo se corre a un lado.
    keepsRow: (node) => module.nodeKinds[node.artifactType]?.dragAxis === 'x',
  });
  store().addElements(nodes, edges);
}

/** Ctrl+C, Ctrl+X, Ctrl+V y Ctrl+D sobre el lienzo, salvo mientras se escribe en un campo. */
export function useClipboardShortcuts(module: DiagramModule | null | undefined) {
  useEffect(() => {
    if (!module) return;
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (window.getSelection()?.toString()) return; // texto seleccionado en un panel: copia del navegador
      const key = event.key.toLowerCase();
      if (key === 'c') copy();
      else if (key === 'x') cut();
      else if (key === 'v') paste(module!);
      else if (key === 'd') duplicate(module!);
      else return;
      event.preventDefault();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [module]);
}
