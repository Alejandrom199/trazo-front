import { faFolderOpen, faPlus, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DiagramProject } from '@/core/model';
import { diagramRegistry } from '@/core/registry';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';
import { useDialogBehavior } from '@/ui/dialogs/useDialogBehavior';
import { useUiStore } from '@/ui/uiStore';
import { addCurrentToProject, openSavedDiagram, openStoredProject, saveCurrentNow } from './projectActions';

const dateFormat = new Intl.DateTimeFormat('es', { dateStyle: 'medium' });

/**
 * Gestor de proyectos: el abierto (nombre, diagramas) y los demás guardados en
 * este navegador, para cambiar entre ellos, crear otro o eliminarlo.
 */
export function ProjectPanel() {
  const open = useUiStore((state) => state.projectOpen);
  const setOpen = useUiStore((state) => state.setProjectOpen);
  const setSidebarOpen = useUiStore((state) => state.setProjectSidebarOpen);
  const project = useProjectStore((state) => state.project);
  const projects = useProjectStore((state) => state.projects);
  const summaries = usePersistenceStore((state) => state.summaries);
  const currentId = useDiagramStore((state) => state.diagram?.id);
  const [name, setName] = useState(project?.name ?? 'Proyecto sin título');
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), [setOpen]);
  useDialogBehavior(open, dialogRef, close);

  useEffect(() => setName(project?.name ?? 'Proyecto sin título'), [project?.name, open]);

  if (!open) return null;
  const projectDiagrams = project?.diagramIds.map((id) => summaries.find((item) => item.id === id)).filter((item) => item !== undefined) ?? [];
  const others = projects.filter((other) => other.id !== project?.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  function openDiagram(id: string) {
    openSavedDiagram(id);
    setOpen(false);
  }

  function addNewDiagram() {
    setOpen(false);
    useUiStore.getState().setGalleryOpen(true, { forProject: true });
  }

  function createProject() {
    useProjectStore.getState().createProject(name, useDiagramStore.getState().diagram?.id);
    saveCurrentNow();
    setSidebarOpen(true);
    setOpen(false);
  }

  function switchTo(projectId: string) {
    openStoredProject(projectId);
    setSidebarOpen(true);
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="project-title" tabIndex={-1} className="flex max-h-[min(720px,calc(100dvh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-panel outline-none">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><FontAwesomeIcon icon={faFolderOpen} /></span>
          <div className="min-w-0 flex-1">
            <h2 id="project-title" className="text-lg font-semibold text-ink-900">{project ? 'Proyecto' : 'Proyectos'}</h2>
            <p className="text-xs text-ink-600">Agrupa varios diagramas. Se guardan en este navegador; para llevarlos a otro equipo, exporta el proyecto.</p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={close} className="flex size-11 items-center justify-center rounded-lg text-ink-600 hover:bg-raised"><FontAwesomeIcon icon={faXmark} /></button>
        </header>

        <div className="overflow-y-auto p-5">
          {!project ? (
            <>
              {others.length > 0 && (
                <section className="mb-6">
                  <h3 className="text-sm font-semibold text-ink-900">Tus proyectos</h3>
                  <ProjectList projects={others} onOpen={switchTo} />
                </section>
              )}
              <form onSubmit={(event) => { event.preventDefault(); createProject(); }}>
                <h3 className="text-sm font-semibold text-ink-900">Nuevo proyecto</h3>
                <label className="mt-3 block text-xs font-medium text-ink-400" htmlFor="project-name">Nombre del proyecto</label>
                <input id="project-name" autoFocus={others.length === 0} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
                <p className="mt-2 text-xs text-ink-600">El diagrama abierto se añadirá como el primer elemento. Después podrás incorporar otros.</p>
                <button type="submit" className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">Crear proyecto</button>
              </form>
            </>
          ) : (
            <>
              <label className="text-xs font-medium text-ink-400" htmlFor="active-project-name">Nombre del proyecto</label>
              <input id="active-project-name" value={name} onChange={(event) => setName(event.target.value)} onBlur={() => useProjectStore.getState().renameProject(name)} className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm font-semibold text-ink-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink-900">Diagramas del proyecto</h3>
                <div className="flex flex-wrap gap-2">
                  {currentId && !project.diagramIds.includes(currentId) && (
                    <button type="button" onClick={addCurrentToProject} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent-soft">Añadir el abierto</button>
                  )}
                  <button type="button" onClick={addNewDiagram} className="flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent"><FontAwesomeIcon icon={faPlus} /> Agregar nuevo diagrama</button>
                </div>
              </div>
              {projectDiagrams.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-line p-4 text-sm text-ink-600">Este proyecto todavía no tiene diagramas guardados.</p>
              ) : (
                <div className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
                  {projectDiagrams.map((summary) => (
                    <div key={summary.id} className="flex items-center gap-3 bg-surface px-3 py-2.5">
                      <button type="button" onClick={() => openDiagram(summary.id)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm font-medium text-ink-900">{summary.name}</span>
                        <span className="text-[11px] text-ink-400">{diagramRegistry.get(summary.diagramType).displayName}</span>
                      </button>
                      <button type="button" aria-label={`Quitar ${summary.name} del proyecto`} onClick={() => useProjectStore.getState().removeDiagram(summary.id)} className="flex size-11 items-center justify-center rounded-lg text-ink-400 hover:bg-danger-soft hover:text-danger"><FontAwesomeIcon icon={faTrash} className="text-xs" /></button>
                    </div>
                  ))}
                </div>
              )}

              {others.length > 0 && (
                <section className="mt-6">
                  <h3 className="text-sm font-semibold text-ink-900">Otros proyectos</h3>
                  <ProjectList projects={others} onOpen={switchTo} />
                </section>
              )}

              <div className="mt-6 flex flex-wrap items-start gap-x-5 gap-y-3 border-t border-line pt-4">
                <div>
                  <button type="button" onClick={() => { useProjectStore.getState().closeProject(); setSidebarOpen(false); setOpen(false); }} className="text-xs font-medium text-ink-600 hover:text-ink-900 hover:underline">Cerrar proyecto</button>
                  <p className="mt-0.5 text-[11px] text-ink-400">Sigue guardado: lo reabres desde aquí.</p>
                </div>
                <div>
                  <button type="button" onClick={() => useProjectStore.getState().closeProject()} className="text-xs font-medium text-accent hover:underline">Nuevo proyecto</button>
                  <p className="mt-0.5 text-[11px] text-ink-400">Este queda guardado.</p>
                </div>
                <DeleteProject project={project} className="ml-auto" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Proyectos guardados que no están abiertos: abrir o eliminar cada uno. */
function ProjectList({ projects, onOpen }: { projects: DiagramProject[]; onOpen: (projectId: string) => void }) {
  return (
    <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
      {projects.map((item) => (
        <li key={item.id} className="flex items-center gap-3 bg-surface px-3 py-2.5">
          <button type="button" onClick={() => onOpen(item.id)} className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium text-ink-900">{item.name}</span>
            <span className="text-[11px] text-ink-400">
              {item.diagramIds.length} {item.diagramIds.length === 1 ? 'diagrama' : 'diagramas'} · {dateFormat.format(new Date(item.updatedAt))}
            </span>
          </button>
          <button type="button" onClick={() => onOpen(item.id)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent-soft">Abrir</button>
          <DeleteProject project={item} iconOnly />
        </li>
      ))}
    </ul>
  );
}

/**
 * Eliminar un proyecto pide confirmación en el mismo sitio. Solo se borra el
 * proyecto (nombre, orden, trazabilidad): sus diagramas siguen en «Tus diagramas».
 */
function DeleteProject({ project, iconOnly = false, className = '' }: { project: DiagramProject; iconOnly?: boolean; className?: string }) {
  const [confirming, setConfirming] = useState(false);
  const setSidebarOpen = useUiStore((state) => state.setProjectSidebarOpen);

  if (confirming) {
    return (
      <div role="alertdialog" aria-label={`Eliminar ${project.name}`} className={`flex flex-wrap items-center gap-2 rounded-lg bg-danger-soft px-3 py-2 ${className}`}>
        <span className="text-xs text-ink-900">¿Eliminar «{project.name}»? Sus diagramas siguen guardados.</span>
        <button
          type="button"
          autoFocus
          onClick={() => {
            const wasOpen = useProjectStore.getState().project?.id === project.id;
            useProjectStore.getState().deleteProject(project.id);
            if (wasOpen) setSidebarOpen(false);
          }}
          className="rounded-md bg-danger px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
        >
          Eliminar
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="rounded-md px-2.5 py-1 text-xs text-ink-600 hover:bg-raised">Cancelar</button>
      </div>
    );
  }
  return iconOnly ? (
    <button type="button" aria-label={`Eliminar el proyecto ${project.name}`} onClick={() => setConfirming(true)} className="flex size-11 items-center justify-center rounded-lg text-ink-400 hover:bg-danger-soft hover:text-danger">
      <FontAwesomeIcon icon={faTrash} className="text-xs" />
    </button>
  ) : (
    <button type="button" onClick={() => setConfirming(true)} className={`text-xs text-danger hover:underline ${className}`}>Eliminar proyecto…</button>
  );
}
