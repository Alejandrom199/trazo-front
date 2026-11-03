import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMemo, useState } from 'react';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { diagramRegistry } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { TemplatePreview } from './TemplatePreview';

const PREVIEW = { width: 220, height: 110 };
const dateFormat = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });

/** "Tus diagramas": los guardados en este navegador, para reabrirlos o borrarlos. */
export function SavedDiagrams({ onOpened }: { onOpened: () => void }) {
  const repository = usePersistenceStore((state) => state.repository);
  const summaries = usePersistenceStore((state) => state.summaries);
  const refresh = usePersistenceStore((state) => state.refresh);
  const openId = useDiagramStore((state) => state.diagram?.id);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Se cargan completos solo para dibujar la miniatura; los ilegibles se omiten.
  const saved = useMemo(
    () =>
      summaries
        .map((summary) => ({ summary, diagram: repository?.load(summary.id) ?? null }))
        .filter((entry) => entry.diagram && diagramRegistry.has(entry.diagram.diagramType)),
    [summaries, repository],
  );

  if (!repository || saved.length === 0) return null;

  function remove(id: string) {
    repository?.remove(id);
    refresh();
    setConfirmingId(null);
    // Borrar el diagrama abierto deja el lienzo en blanco, para que el guardado automático no lo reviva.
    if (id === openId) useDiagramStore.getState().newDiagram({ diagramType: 'activity', name: 'Diagrama sin título' });
  }

  return (
    <section className="mb-7">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Tus diagramas</h3>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {saved.map(({ summary, diagram }) => {
          const module = diagramRegistry.get(diagram!.diagramType);
          const isOpen = summary.id === openId;
          return (
            <div key={summary.id} className="group relative overflow-hidden rounded-xl border border-line bg-surface hover:border-accent/40">
              <button
                type="button"
                onClick={() => {
                  useDiagramStore.getState().openDiagram(diagram!);
                  onOpened();
                }}
                className="block w-full text-left"
              >
                <div className="flex h-[110px] items-center justify-center border-b border-line bg-canvas">
                  <TemplatePreview diagram={diagram!} module={module} {...PREVIEW} />
                </div>
                <div className="px-3 py-2.5">
                  <p className="truncate text-sm font-medium text-ink-900 group-hover:text-accent">{summary.name || 'Sin título'}</p>
                  <p className="flex items-center gap-1.5 text-[11px] text-ink-400">
                    {isOpen && <span className="rounded-full bg-accent-soft px-1.5 py-px font-medium text-accent">Abierto</span>}
                    {dateFormat.format(new Date(summary.updatedAt))}
                  </p>
                </div>
              </button>

              {confirmingId === summary.id ? (
                // «Eliminar» va a la derecha, donde estaba el tacho: confirmar no obliga a mover el ratón.
                <div className="absolute top-1 right-1 flex items-center gap-1 rounded-lg border border-line bg-surface p-1 shadow-panel">
                  <button type="button" onClick={() => setConfirmingId(null)} className="rounded-md px-2 py-1 text-[11px] text-ink-600 hover:bg-canvas">
                    Cancelar
                  </button>
                  <button type="button" onClick={() => remove(summary.id)} className="rounded-md bg-danger px-2 py-1 text-[11px] font-medium text-white">
                    Eliminar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingId(summary.id)}
                  aria-label={`Eliminar «${summary.name}»`}
                  className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-lg bg-surface/90 text-ink-400 opacity-0 shadow-sm group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
                >
                  <FontAwesomeIcon icon={faTrashCan} className="text-xs" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
