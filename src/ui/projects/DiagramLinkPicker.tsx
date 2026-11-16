import { faDiagramProject, faPen, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRef, useState } from 'react';
import { useActiveModule } from '@/canvas/useActiveModule';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';
import { useDialogBehavior } from '@/ui/dialogs/useDialogBehavior';
import { inputClass } from '@/ui/explanation/formFields';
import { useUiStore } from '@/ui/uiStore';
import { createLinkedDiagram, linkNodeToDiagram } from './diagramLinkActions';
import { useProjectDiagrams } from './useProjectDiagrams';

/**
 * Al colocar un artefacto que enlaza otro diagrama (una acción de subproceso),
 * en vez de escribir su nombre se elige el diagrama que lo detalla: el nodo
 * toma su nombre. También se puede crear el diagrama ahí mismo, o solo nombrarlo.
 */
export function DiagramLinkPicker() {
  const nodeId = useUiStore((state) => state.linkPickerNodeId);
  if (!nodeId) return null;
  return <PickerDialog nodeId={nodeId} />;
}

function PickerDialog({ nodeId }: { nodeId: string }) {
  const module = useActiveModule();
  const current = useDiagramStore((state) => state.diagram);
  const project = useProjectStore((state) => state.project);
  const diagrams = useProjectDiagrams();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [newName, setNewName] = useState('');
  const close = () => useUiStore.getState().setLinkPickerNodeId(null);
  useDialogBehavior(true, dialogRef, close);

  const node = current?.nodes.find((candidate) => candidate.id === nodeId);
  const link = node && module?.nodeKinds[node.artifactType]?.diagramLink;
  if (!node || !link) return null;
  const candidates = diagrams.filter((diagram) => diagram.id !== current?.id && link.diagramTypes.includes(diagram.diagramType));

  function pick(diagram: { id: string; name: string }) {
    linkNodeToDiagram(nodeId, diagram);
    close();
  }
  function create() {
    if (createLinkedDiagram(nodeId, newName, link!.diagramTypes[0]!, false)) close();
  }
  function nameOnly() {
    close();
    useDiagramStore.getState().startEditing(nodeId);
  }

  return (
    <div className="motion-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="link-picker-title" tabIndex={-1} className="flex max-h-[min(36rem,90dvh)] w-full max-w-md flex-col rounded-xl border border-line bg-surface shadow-panel outline-none">
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="link-picker-title" className="text-sm font-semibold text-ink-900">¿Qué proceso invoca este paso?</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-600">Elige el diagrama que lo detalla: el subproceso tomará su nombre y podrás abrirlo desde aquí.</p>
          </div>
          <button type="button" onClick={close} aria-label="Cerrar" className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-raised hover:text-ink-900">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {!project ? (
            <p className="rounded-lg bg-canvas px-3 py-2.5 text-xs leading-relaxed text-ink-600">
              Los subprocesos enlazan diagramas de un mismo proyecto. Crea un proyecto (Archivo › Proyecto) para vincularlo; mientras tanto, puedes solo nombrarlo.
            </p>
          ) : (
            <>
              <section>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Diagramas del proyecto</h3>
                {candidates.length === 0 ? (
                  <p className="text-xs leading-relaxed text-ink-400">Aún no hay otro diagrama de actividades en el proyecto. Créalo abajo.</p>
                ) : (
                  <ul className="space-y-1">
                    {candidates.map((diagram) => (
                      <li key={diagram.id}>
                        <button type="button" onClick={() => pick(diagram)} className="flex w-full items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-left hover:border-accent/50 hover:bg-accent-soft/40">
                          <FontAwesomeIcon icon={faDiagramProject} className="text-xs text-accent" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink-900">{diagram.name}</span>
                            <span className="block text-[11px] text-ink-400">{diagram.nodes.length} elementos</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <form onSubmit={(event) => { event.preventDefault(); create(); }}>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">O crea uno nuevo</h3>
                <div className="flex gap-2">
                  <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nombre del subproceso, p. ej. Procesar pago" className={inputClass} />
                  <button type="submit" disabled={!newName.trim()} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-medium text-white disabled:opacity-40">
                    <FontAwesomeIcon icon={faPlus} className="text-xs" /> Crear
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <footer className="flex justify-end border-t border-line px-5 py-3">
          <button type="button" onClick={nameOnly} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-raised hover:text-ink-900">
            <FontAwesomeIcon icon={faPen} className="text-[10px]" /> Solo escribir el nombre
          </button>
        </footer>
      </div>
    </div>
  );
}
