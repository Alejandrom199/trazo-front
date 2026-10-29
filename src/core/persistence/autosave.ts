import type { Diagram } from '@/core/model';
import { useDiagramStore } from '@/core/store/diagramStore';
import { usePersistenceStore } from './persistenceStore';

/** Espera tras el último cambio antes de guardar: arrastrar un nodo no escribe 60 veces por segundo. */
const SAVE_DELAY_MS = 600;

/**
 * Guarda automáticamente el diagrama abierto cada vez que cambia.
 * - No guarda un lienzo recién creado y vacío (no llenaría la lista de "Sin título").
 * - Recuerda cuál fue el último diagrama abierto para reabrirlo al volver.
 * - Al cerrar la pestaña guarda lo pendiente sin esperar.
 * Devuelve una función para detenerlo.
 */
export function startAutosave(): () => void {
  let timer: number | undefined;
  let pending: Diagram | null = null;

  function saveNow() {
    window.clearTimeout(timer);
    const { repository, setStatus, refresh } = usePersistenceStore.getState();
    if (!pending || !repository) return;
    try {
      repository.save(pending);
      repository.setLastOpened(pending.id);
      setStatus('saved');
      refresh();
    } catch {
      // Lo más común: el almacenamiento del navegador está lleno.
      setStatus('error');
    }
    pending = null;
  }

  function isWorthSaving(diagram: Diagram): boolean {
    const { summaries } = usePersistenceStore.getState();
    return diagram.nodes.length > 0 || summaries.some((summary) => summary.id === diagram.id);
  }

  const unsubscribe = useDiagramStore.subscribe((state, previous) => {
    const diagram = state.diagram;
    if (!diagram || diagram === previous.diagram) return;
    const { repository, setStatus } = usePersistenceStore.getState();
    if (!repository) return;

    if (diagram.id !== previous.diagram?.id) repository.setLastOpened(diagram.id);
    if (!isWorthSaving(diagram)) return;

    pending = diagram;
    setStatus('saving');
    window.clearTimeout(timer);
    timer = window.setTimeout(saveNow, SAVE_DELAY_MS);
  });

  window.addEventListener('pagehide', saveNow);
  return () => {
    unsubscribe();
    window.removeEventListener('pagehide', saveNow);
    window.clearTimeout(timer);
  };
}
