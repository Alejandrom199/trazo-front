import { faChevronLeft, faFolderOpen, faGear, faLink, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { diagramRegistry } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { useUiStore } from '@/ui/uiStore';

/** Navegación permanente de los diagramas que forman el proyecto activo. */
export function ProjectSidebar() {
  const project = useProjectStore((state) => state.project);
  const summaries = usePersistenceStore((state) => state.summaries);
  const currentId = useDiagramStore((state) => state.diagram?.id);
  const open = useUiStore((state) => state.projectSidebarOpen);
  const setOpen = useUiStore((state) => state.setProjectSidebarOpen);
  const setProjectOpen = useUiStore((state) => state.setProjectOpen);
  const setInspectorTab = useUiStore((state) => state.setInspectorTab);

  if (!project || !open) return null;
  const diagrams = project.diagramIds
    .map((id) => summaries.find((summary) => summary.id === id))
    .filter((summary) => summary !== undefined);

  function saveCurrentNow() {
    const diagram = useDiagramStore.getState().diagram;
    const persistence = usePersistenceStore.getState();
    if (!diagram || !persistence.repository) return;
    persistence.repository.save(diagram);
    persistence.refresh();
  }

  function openDiagram(id: string) {
    if (id === currentId) return;
    saveCurrentNow();
    const diagram = usePersistenceStore.getState().repository?.load(id);
    if (diagram) useDiagramStore.getState().openDiagram(diagram);
  }

  function addCurrent() {
    if (!currentId) return;
    saveCurrentNow();
    useProjectStore.getState().addDiagram(currentId);
  }

  const sidebar = (
    <aside
      aria-label="Diagramas del proyecto"
      className="flex h-full w-[17.5rem] shrink-0 flex-col border-r border-line bg-surface"
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <FontAwesomeIcon icon={faFolderOpen} className="text-sm" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-ink-900">{project.name}</h2>
          <p className="text-[11px] text-ink-400">{project.diagramIds.length} {project.diagramIds.length === 1 ? 'diagrama' : 'diagramas'}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Ocultar navegador del proyecto"
          title="Ocultar proyecto"
          className="hidden size-8 items-center justify-center rounded-lg text-ink-400 hover:bg-raised hover:text-ink-900 lg:flex"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar navegador del proyecto"
          className="flex size-8 items-center justify-center rounded-lg text-ink-400 hover:bg-raised hover:text-ink-900 lg:hidden"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <p className="px-2 pb-2 pt-1 text-[11px] font-medium text-ink-400">Diagramas</p>
        {diagrams.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-4 text-xs leading-relaxed text-ink-600">
            Añade el diagrama abierto para empezar a navegar el proyecto.
          </p>
        ) : (
          <ul className="space-y-1">
            {diagrams.map((summary) => {
              const active = summary.id === currentId;
              return (
                <li key={summary.id}>
                  <button
                    type="button"
                    onClick={() => openDiagram(summary.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                      active ? 'bg-accent-soft text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'
                    }`}
                  >
                    <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${active ? 'bg-accent' : 'bg-line group-hover:bg-ink-400'}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{summary.name || 'Sin título'}</span>
                      <span className={`block truncate text-[11px] ${active ? 'text-accent/75' : 'text-ink-400'}`}>
                        {diagramRegistry.get(summary.diagramType).displayName}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {currentId && !project.diagramIds.includes(currentId) && (
          <button
            type="button"
            onClick={addCurrent}
            className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-accent/40 px-3 py-2 text-left text-xs font-medium text-accent hover:bg-accent-soft"
          >
            <FontAwesomeIcon icon={faPlus} />
            Añadir el diagrama abierto
          </button>
        )}
      </div>

      <footer className="border-t border-line p-2">
        <button
          type="button"
          onClick={() => setInspectorTab('traceability')}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-ink-600 hover:bg-raised hover:text-accent"
        >
          <FontAwesomeIcon icon={faLink} className="text-[11px]" />
          Trazabilidad
          <span className="ml-auto rounded-full bg-accent-soft px-1.5 py-px text-[10px] font-medium text-accent">{project.traceLinks.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setProjectOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-ink-600 hover:bg-raised hover:text-ink-900"
        >
          <FontAwesomeIcon icon={faGear} className="text-[11px]" />
          Administrar proyecto
        </button>
      </footer>
    </aside>
  );

  return (
    <>
      <div className="hidden h-full lg:block">{sidebar}</div>
      <div className="fixed inset-0 z-40 flex bg-black/35 backdrop-blur-[1px] lg:hidden" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
        {sidebar}
      </div>
    </>
  );
}

/** Restaura la barra lateral sin abrir el gestor modal. */
export function ProjectSidebarToggle() {
  const project = useProjectStore((state) => state.project);
  const open = useUiStore((state) => state.projectSidebarOpen);
  const setOpen = useUiStore((state) => state.setProjectSidebarOpen);
  if (!project || open) return null;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      title={`Mostrar proyecto: ${project.name}`}
      aria-label={`Mostrar proyecto ${project.name}`}
      className="glass-panel relative flex h-11 items-center gap-2 rounded-xl px-3.5 text-[13px] text-ink-600 hover:text-accent"
    >
      <FontAwesomeIcon icon={faFolderOpen} />
      <span className="hidden max-w-36 truncate sm:inline">{project.name}</span>
    </button>
  );
}
