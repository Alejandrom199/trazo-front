import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowUpRightFromSquare,
  faBookOpen,
  faDiagramProject,
  faFile,
  faFolder,
  faFolderOpen,
  faLink,
  faMagnifyingGlass,
  faMap,
  faPlus,
  faTrash,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { groupByFolder, MAP_PHASES, PHASE_OF, type DiagramProject } from '@/core/model';
import { diagramRegistry } from '@/core/registry';
import type { DiagramSummary } from '@/core/persistence/diagramRepository';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';
import { SAMPLE_PROJECT_NAME } from '@/diagrams/sampleProject';
import { useDialogBehavior } from '@/ui/dialogs/useDialogBehavior';
import { useUiStore } from '@/ui/uiStore';
import { addCurrentToProject, openSampleProject, openSavedDiagram, openStoredProject, saveCurrentNow } from './projectActions';

const dateFormat = new Intl.DateTimeFormat('es', { dateStyle: 'medium' });

/** Qué muestra la columna derecha: un proyecto guardado o el formulario de uno nuevo. */
type Selection = { kind: 'project'; id: string } | { kind: 'new' };

const ui = () => useUiStore.getState();

/**
 * Gestor de proyectos en dos columnas: a la izquierda todos los proyectos del
 * navegador (con buscador, el nuevo y el de ejemplo); a la derecha, el elegido
 * con sus cifras, la cobertura por fase y sus diagramas por carpeta, o el
 * formulario para crear uno. Elegir un proyecto no lo abre: «Abrir» lo hace.
 */
export function ProjectPanel() {
  const open = useUiStore((state) => state.projectOpen);
  if (!open) return null;
  return <ProjectManager />;
}

function ProjectManager() {
  const project = useProjectStore((state) => state.project);
  const projects = useProjectStore((state) => state.projects);
  const summaries = usePersistenceStore((state) => state.summaries);
  const close = useCallback(() => ui().setProjectOpen(false), []);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(true, dialogRef, close);
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<Selection>(() =>
    project ? { kind: 'project', id: project.id } : projects[0] ? { kind: 'project', id: projects[0].id } : { kind: 'new' });

  const sorted = useMemo(
    () => [...projects].sort((a, b) => (a.id === project?.id ? -1 : b.id === project?.id ? 1 : b.updatedAt.localeCompare(a.updatedAt))),
    [projects, project?.id],
  );
  const filtered = sorted.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = selection.kind === 'project' ? projects.find((item) => item.id === selection.id) : undefined;

  // Si el elegido se borra, se pasa al abierto, al primero o al formulario.
  useEffect(() => {
    if (selection.kind === 'project' && !selected) setSelection(sorted[0] ? { kind: 'project', id: sorted[0].id } : { kind: 'new' });
  }, [selection, selected, sorted]);

  return (
    <div className="motion-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="projects-title" tabIndex={-1} className="flex h-[min(760px,calc(100dvh-2rem))] w-full max-w-5xl flex-col overflow-hidden md:flex-row rounded-2xl border border-line bg-surface shadow-panel outline-none">
        {/* Columna izquierda: todos los proyectos. */}
        <aside className="flex max-h-[42%] shrink-0 flex-col border-b border-line bg-canvas/40 md:max-h-none md:w-72 md:border-r md:border-b-0">
          <header className="flex items-center gap-2 px-4 pt-4 pb-3">
            <h2 id="projects-title" className="text-base font-semibold text-ink-900">Proyectos</h2>
            <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-ink-600">{projects.length}</span>
            <button type="button" aria-label="Cerrar" onClick={close} className="ml-auto flex size-9 items-center justify-center rounded-lg text-ink-400 hover:bg-raised hover:text-ink-900 md:hidden">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </header>
          <div className="space-y-2 px-3 pb-3">
            <button
              type="button"
              onClick={() => setSelection({ kind: 'new' })}
              className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${selection.kind === 'new' ? 'bg-brand text-white' : 'bg-accent-soft text-accent hover:bg-brand hover:text-white'}`}
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" /> Nuevo proyecto
            </button>
            {projects.length > 4 && (
              <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 focus-within:border-accent">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[11px] text-ink-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proyecto" aria-label="Buscar proyecto" className="h-9 min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none" />
              </label>
            )}
          </div>
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
            {filtered.length === 0 && <li className="px-2 py-3 text-xs text-ink-400">{projects.length === 0 ? 'Todavía no tienes proyectos.' : 'Ningún proyecto se llama así.'}</li>}
            {filtered.map((item) => {
              const active = selection.kind === 'project' && selection.id === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelection({ kind: 'project', id: item.id })}
                    aria-current={active ? 'true' : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left ${active ? 'bg-surface shadow-sm ring-1 ring-accent/40' : 'hover:bg-raised'}`}
                  >
                    <ProjectBadge name={item.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-900">{item.name}</span>
                      <span className="block text-[11px] text-ink-400">
                        {item.diagramIds.length} {item.diagramIds.length === 1 ? 'diagrama' : 'diagramas'} · {dateFormat.format(new Date(item.updatedAt))}
                      </span>
                    </span>
                    {item.id === project?.id && <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">Abierto</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <footer className="border-t border-line p-3">
            <button
              type="button"
              onClick={() => { if (openSampleProject()) close(); }}
              className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-raised"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><FontAwesomeIcon icon={faBookOpen} className="text-xs" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink-900">Proyecto de ejemplo</span>
                <span className="block text-[11px] leading-snug text-ink-400">«{SAMPLE_PROJECT_NAME}», con carpetas, subproceso, MER y relaciones</span>
              </span>
            </button>
          </footer>
        </aside>

        {/* Columna derecha: el proyecto elegido o el formulario. */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="hidden items-center justify-end px-4 pt-3 md:flex">
            <button type="button" aria-label="Cerrar" onClick={close} className="flex size-9 items-center justify-center rounded-lg text-ink-400 hover:bg-raised hover:text-ink-900">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          {selection.kind === 'new' ? (
            <NewProjectForm onCreated={close} hasProjects={projects.length > 0} />
          ) : selected ? (
            <ProjectDetail key={selected.id} project={selected} isOpen={selected.id === project?.id} summaries={summaries} onDone={close} />
          ) : null}
        </section>
      </div>
    </div>
  );
}

/** Cuadro con las iniciales del proyecto: identifica cada uno en la lista de un vistazo. */
function ProjectBadge({ name, large = false }: { name: string; large?: boolean }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('') || 'P';
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-lg bg-accent-soft font-semibold text-accent ${large ? 'size-12 text-base' : 'size-9 text-xs'}`} aria-hidden>
      {initials}
    </span>
  );
}

type StartFrom = 'blank' | 'current' | 'sample';

/** Crear un proyecto: nombre y cómo empezar (vacío, con el diagrama abierto o desde el ejemplo). */
function NewProjectForm({ onCreated, hasProjects }: { onCreated: () => void; hasProjects: boolean }) {
  const current = useDiagramStore((state) => state.diagram);
  const [name, setName] = useState('');
  const [start, setStart] = useState<StartFrom>(current ? 'current' : 'blank');
  const options: { id: StartFrom; title: string; text: string; icon: IconDefinition; disabled?: boolean }[] = [
    { id: 'current', title: 'Con el diagrama abierto', text: current ? `Empieza con «${current.name || 'Sin título'}».` : 'No hay un diagrama abierto.', icon: faFile, disabled: !current },
    { id: 'blank', title: 'En blanco', text: 'Un proyecto vacío; agregas los diagramas después.', icon: faFolder },
    { id: 'sample', title: 'Desde el ejemplo', text: `Una copia de «${SAMPLE_PROJECT_NAME}» para explorar o adaptar.`, icon: faBookOpen },
  ];

  function create() {
    if (start === 'sample') {
      if (!openSampleProject()) return;
      if (name.trim()) useProjectStore.getState().renameProject(name);
    } else {
      saveCurrentNow();
      useProjectStore.getState().createProject(name || 'Proyecto sin título', start === 'current' ? current?.id : undefined);
      ui().setProjectSidebarOpen(true);
    }
    onCreated();
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); create(); }} className="min-h-0 flex-1 overflow-y-auto px-8 pb-8">
      <h3 className="text-xl font-semibold text-ink-900">Nuevo proyecto</h3>
      <p className="mt-1 text-sm text-ink-600">Un proyecto agrupa los diagramas de un mismo sistema, en carpetas, con su trazabilidad y su mapa.</p>
      <label className="mt-6 block text-xs font-medium text-ink-600" htmlFor="new-project-name">Nombre</label>
      <input id="new-project-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder={start === 'sample' ? SAMPLE_PROJECT_NAME : 'p. ej. Sistema de préstamos'} className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />

      <fieldset className="mt-6">
        <legend className="text-xs font-medium text-ink-600">Cómo empezar</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {options.map((option) => {
            const chosen = start === option.id;
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-3.5 ${option.disabled ? 'cursor-not-allowed opacity-50' : ''} ${chosen ? 'border-accent bg-accent-soft/40 ring-1 ring-accent/40' : 'border-line hover:border-accent/40'}`}
              >
                <input type="radio" name="start-from" value={option.id} checked={chosen} disabled={option.disabled} onChange={() => setStart(option.id)} className="sr-only" />
                <FontAwesomeIcon icon={option.icon} className={`text-sm ${chosen ? 'text-accent' : 'text-ink-400'}`} />
                <span className="text-sm font-medium text-ink-900">{option.title}</span>
                <span className="text-xs leading-snug text-ink-600">{option.text}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 flex items-center gap-3">
        <button type="submit" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">Crear proyecto</button>
        {hasProjects && <span className="text-xs text-ink-400">El proyecto abierto queda guardado.</span>}
      </div>
    </form>
  );
}

/** Detalle de un proyecto: nombre, cifras, cobertura por fase, diagramas por carpeta y acciones. */
function ProjectDetail({ project, isOpen, summaries, onDone }: { project: DiagramProject; isOpen: boolean; summaries: DiagramSummary[]; onDone: () => void }) {
  const currentId = useDiagramStore((state) => state.diagram?.id);
  const [name, setName] = useState(project.name);
  const summaryOf = (id: string) => summaries.find((summary) => summary.id === id);
  const diagrams = project.diagramIds.map(summaryOf).filter((summary) => summary !== undefined);
  const covered = new Set(diagrams.map((summary) => PHASE_OF[summary.diagramType]));
  const groups = groupByFolder(project).filter((group) => group.diagramIds.length > 0 || group.folder);

  function openProject() {
    if (!isOpen) openStoredProject(project.id);
    ui().setProjectSidebarOpen(true);
    onDone();
  }
  function openDiagram(id: string) {
    if (!isOpen) openStoredProject(project.id);
    openSavedDiagram(id);
    ui().setProjectSidebarOpen(true);
    onDone();
  }
  function openMap() {
    if (!isOpen) openStoredProject(project.id);
    onDone();
    ui().setProjectMapOpen(true);
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8">
      <div className="flex items-start gap-4">
        <ProjectBadge name={project.name} large />
        <div className="min-w-0 flex-1">
          <input
            aria-label="Nombre del proyecto"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => useProjectStore.getState().renameProject(name, project.id)}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            className="-ml-1.5 w-full rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-xl font-semibold text-ink-900 outline-none hover:border-line focus:border-accent"
          />
          <p className="mt-0.5 text-xs text-ink-400">
            Creado el {dateFormat.format(new Date(project.createdAt))} · actualizado el {dateFormat.format(new Date(project.updatedAt))}
            {isOpen && <span className="ml-2 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">Abierto</span>}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={openProject} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          <FontAwesomeIcon icon={faFolderOpen} className="text-xs" /> {isOpen ? 'Ir al proyecto' : 'Abrir proyecto'}
        </button>
        <button type="button" onClick={openMap} disabled={diagrams.length === 0} className="flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-900 hover:border-accent/50 hover:text-accent disabled:opacity-40">
          <FontAwesomeIcon icon={faMap} className="text-xs" /> Ver mapa
        </button>
        {isOpen && (
          <button type="button" onClick={() => { useProjectStore.getState().closeProject(); ui().setProjectSidebarOpen(false); }} className="rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-raised hover:text-ink-900">
            Cerrar proyecto
          </button>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Diagramas" value={diagrams.length} icon={faDiagramProject} />
        <Stat label="Carpetas" value={project.folders.length} icon={faFolder} />
        <Stat label="Relaciones" value={project.diagramRelations.length + project.traceLinks.length} icon={faLink} />
        <Stat label="Fases cubiertas" value={`${covered.size}/${MAP_PHASES.length}`} icon={faMap} />
      </dl>

      <section className="mt-6" aria-label="Cobertura por fase">
        <h4 className="text-xs font-semibold text-ink-900">Cobertura por fase</h4>
        <ol className="mt-2 grid grid-cols-7 gap-1">
          {MAP_PHASES.map((phase) => {
            const has = covered.has(phase.id);
            return (
              <li key={phase.id} title={`${phase.name}: ${phase.question}${has ? '' : ' (sin diagramas)'}`} className="min-w-0">
                <span className={`block h-1.5 rounded-full ${has ? 'bg-accent' : 'bg-raised'}`} />
                <span className={`mt-1 block truncate text-[10px] ${has ? 'text-ink-900' : 'text-ink-400'}`}>{phase.name}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-xs font-semibold text-ink-900">Diagramas</h4>
          {isOpen && (
            <div className="ml-auto flex gap-1">
              {currentId && !project.diagramIds.includes(currentId) && (
                <button type="button" onClick={addCurrentToProject} className="rounded-md px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent-soft">Añadir el abierto</button>
              )}
              <button type="button" onClick={() => { onDone(); ui().setGalleryOpen(true, { forProject: true }); }} className="flex items-center gap-1.5 rounded-md bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                <FontAwesomeIcon icon={faPlus} className="text-[10px]" /> Nuevo diagrama
              </button>
            </div>
          )}
        </div>
        {diagrams.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-line p-4 text-sm text-ink-600">Este proyecto todavía no tiene diagramas.</p>
        ) : (
          <div className="mt-2 space-y-3">
            {groups.map((group) => {
              const items = group.diagramIds.map(summaryOf).filter((summary) => summary !== undefined);
              return (
                <div key={group.folder?.id ?? 'loose'}>
                  {group.folder && (
                    <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-ink-600">
                      <FontAwesomeIcon icon={faFolderOpen} className="text-[10px] text-accent" /> {group.folder.name}
                      <span className="text-ink-400">· {items.length}</span>
                    </p>
                  )}
                  {items.length > 0 && (
                    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                      {items.map((summary) => (
                        <li key={summary.id} className="group flex items-center gap-3 px-3 py-2">
                          <button type="button" onClick={() => openDiagram(summary.id)} className="min-w-0 flex-1 text-left">
                            <span className="block truncate text-sm font-medium text-ink-900 group-hover:text-accent">{summary.name || 'Sin título'}</span>
                            <span className="text-[11px] text-ink-400">{diagramRegistry.has(summary.diagramType) ? diagramRegistry.get(summary.diagramType).displayName : summary.diagramType}</span>
                          </button>
                          <button type="button" onClick={() => openDiagram(summary.id)} aria-label={`Abrir «${summary.name}»`} className="flex size-8 items-center justify-center rounded-md text-ink-400 opacity-0 hover:bg-raised hover:text-accent focus-visible:opacity-100 group-hover:opacity-100">
                            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[11px]" />
                          </button>
                          {isOpen && (
                            <button type="button" aria-label={`Quitar «${summary.name}» del proyecto`} title="Quitar del proyecto (el diagrama sigue guardado)" onClick={() => useProjectStore.getState().removeDiagram(summary.id)} className="flex size-8 items-center justify-center rounded-md text-ink-400 opacity-0 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 group-hover:opacity-100">
                              <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-8 border-t border-line pt-4">
        <DeleteProject project={project} />
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon: IconDefinition }) {
  return (
    <div className="rounded-xl border border-line px-3.5 py-3">
      <dt className="flex items-center gap-1.5 text-[11px] text-ink-400"><FontAwesomeIcon icon={icon} className="text-[10px]" />{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-ink-900">{value}</dd>
    </div>
  );
}

/**
 * Eliminar un proyecto pide confirmación en el mismo sitio. Solo se borra el
 * proyecto (nombre, carpetas, trazabilidad): sus diagramas siguen en «Tus diagramas».
 */
function DeleteProject({ project }: { project: DiagramProject }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return <button type="button" onClick={() => setConfirming(true)} className="text-xs text-danger hover:underline">Eliminar proyecto…</button>;
  }
  return (
    <div role="alertdialog" aria-label={`Eliminar ${project.name}`} className="flex flex-wrap items-center gap-2 rounded-lg bg-danger-soft px-3 py-2">
      <span className="text-xs text-ink-900">¿Eliminar «{project.name}»? Sus diagramas siguen guardados en «Tus diagramas».</span>
      <button
        type="button"
        autoFocus
        onClick={() => {
          const wasOpen = useProjectStore.getState().project?.id === project.id;
          useProjectStore.getState().deleteProject(project.id);
          if (wasOpen) ui().setProjectSidebarOpen(false);
        }}
        className="rounded-md bg-danger px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
      >
        Eliminar
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="rounded-md px-2.5 py-1 text-xs text-ink-600 hover:bg-raised">Cancelar</button>
    </div>
  );
}
