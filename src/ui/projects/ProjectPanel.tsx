import { faFolderOpen, faPlus, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useRef, useState } from 'react';
import { diagramRegistry } from '@/core/registry';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';
import { useDialogBehavior } from '@/ui/dialogs/useDialogBehavior';
import { useUiStore } from '@/ui/uiStore';
import { addCurrentToProject, openSavedDiagram, saveCurrentNow } from './projectActions';

export function ProjectPanel() {
  const open = useUiStore((state) => state.projectOpen);
  const setOpen = useUiStore((state) => state.setProjectOpen);
  const setSidebarOpen = useUiStore((state) => state.setProjectSidebarOpen);
  const project = useProjectStore((state) => state.project);
  const summaries = usePersistenceStore((state) => state.summaries);
  const currentId = useDiagramStore((state) => state.diagram?.id);
  const [name, setName] = useState(project?.name ?? 'Proyecto sin título');
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), [setOpen]);
  useDialogBehavior(open, dialogRef, close);

  useEffect(() => setName(project?.name ?? 'Proyecto sin título'), [project?.name, open]);

  if (!open) return null;
  const projectDiagrams = project?.diagramIds.map((id) => summaries.find((item) => item.id === id)).filter((item) => item !== undefined) ?? [];

  function openDiagram(id: string) {
    openSavedDiagram(id);
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="project-title" tabIndex={-1} className="flex max-h-[min(720px,calc(100dvh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-panel outline-none">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><FontAwesomeIcon icon={faFolderOpen} /></span>
          <div className="min-w-0 flex-1"><h2 id="project-title" className="text-lg font-semibold text-ink-900">Proyecto</h2><p className="text-xs text-ink-600">Agrupa varios diagramas y llévalos juntos en un archivo.</p></div>
          <button type="button" aria-label="Cerrar" onClick={close} className="flex size-11 items-center justify-center rounded-lg text-ink-600 hover:bg-raised"><FontAwesomeIcon icon={faXmark} /></button>
        </header>

        <div className="overflow-y-auto p-5">
          {!project ? (
            <form onSubmit={(event) => { event.preventDefault(); const id = useDiagramStore.getState().diagram?.id; useProjectStore.getState().createProject(name, id); saveCurrentNow(); setSidebarOpen(true); setOpen(false); }}>
              <label className="text-sm font-medium text-ink-900" htmlFor="project-name">Nombre del proyecto</label>
              <input id="project-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
              <p className="mt-2 text-xs text-ink-600">El diagrama abierto se añadirá como el primer elemento. Después podrás incorporar otros.</p>
              <button type="submit" className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">Crear proyecto</button>
            </form>
          ) : (
            <>
              <label className="text-xs font-medium text-ink-400" htmlFor="active-project-name">Nombre del proyecto</label>
              <input id="active-project-name" value={name} onChange={(event) => setName(event.target.value)} onBlur={() => useProjectStore.getState().renameProject(name)} className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm font-semibold text-ink-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />

              <div className="mt-5 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-ink-900">Diagramas del proyecto</h3>{currentId && !project.diagramIds.includes(currentId) && <button type="button" onClick={addCurrentToProject} className="flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent"><FontAwesomeIcon icon={faPlus} /> Añadir el abierto</button>}</div>
              {projectDiagrams.length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-line p-4 text-sm text-ink-600">Este proyecto todavía no tiene diagramas guardados.</p> : <div className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">{projectDiagrams.map((summary) => <div key={summary.id} className="flex items-center gap-3 bg-surface px-3 py-2.5"><button type="button" onClick={() => openDiagram(summary.id)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-medium text-ink-900">{summary.name}</span><span className="text-[11px] text-ink-400">{diagramRegistry.get(summary.diagramType).displayName}</span></button><button type="button" aria-label={`Quitar ${summary.name} del proyecto`} onClick={() => useProjectStore.getState().removeDiagram(summary.id)} className="flex size-11 items-center justify-center rounded-lg text-ink-400 hover:bg-danger-soft hover:text-danger"><FontAwesomeIcon icon={faTrash} className="text-xs" /></button></div>)}</div>}

              <div className="mt-5 border-t border-line pt-4"><button type="button" onClick={() => { useProjectStore.getState().closeProject(); setSidebarOpen(false); setOpen(false); }} className="text-xs text-danger hover:underline">Cerrar proyecto en Trazo</button><p className="mt-1 text-[11px] text-ink-400">No borra los diagramas guardados ni el archivo que hayas exportado.</p></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
