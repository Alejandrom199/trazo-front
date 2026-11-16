import {
  faChevronDown,
  faChevronLeft,
  faFolder,
  faFolderOpen,
  faFolderPlus,
  faGear,
  faGripVertical,
  faLink,
  faMap,
  faPen,
  faPlus,
  faTrashCan,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { groupByFolder, type ProjectFolder } from '@/core/model';
import { diagramRegistry } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import type { DiagramSummary } from '@/core/persistence/diagramRepository';
import { useUiStore } from '@/ui/uiStore';
import { addCurrentToProject, openSavedDiagram } from './projectActions';

/** Dónde caerá el diagrama que se arrastra: antes o después de otro, o dentro de una carpeta (null = sin carpeta). */
type DropSpot = { kind: 'diagram'; targetId: string; after: boolean } | { kind: 'folder'; folderId: string | null };

const projects = () => useProjectStore.getState();

/**
 * Navegación permanente del proyecto activo: sus diagramas, agrupados en
 * carpetas de un solo nivel. Un diagrama se arrastra para reordenarlo o para
 * llevarlo a otra carpeta (o sacarlo, soltándolo en «Sin carpeta»).
 */
export function ProjectSidebar() {
  const project = useProjectStore((state) => state.project);
  const summaries = usePersistenceStore((state) => state.summaries);
  const currentId = useDiagramStore((state) => state.diagram?.id);
  const open = useUiStore((state) => state.projectSidebarOpen);
  const setOpen = useUiStore((state) => state.setProjectSidebarOpen);
  const setProjectOpen = useUiStore((state) => state.setProjectOpen);
  const setInspectorTab = useUiStore((state) => state.setInspectorTab);
  const setProjectMapOpen = useUiStore((state) => state.setProjectMapOpen);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropSpot, setDropSpot] = useState<DropSpot | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);

  if (!project || !open) return null;
  const summaryOf = (id: string) => summaries.find((summary) => summary.id === id);
  const groups = groupByFolder(project).map((group) => ({ ...group, summaries: group.diagramIds.map(summaryOf).filter((summary) => summary !== undefined) }));
  const loose = groups[0]!;
  const folders = groups.slice(1);

  /** Posición final del arrastrado, contada en la lista sin él (como la espera moveDiagram). */
  function dropIndex(targetId: string, after: boolean): number {
    const rest = project!.diagramIds.filter((id) => id !== draggedId);
    return rest.indexOf(targetId) + (after ? 1 : 0);
  }

  function overDiagram(event: DragEvent<HTMLLIElement>, targetId: string) {
    if (!draggedId) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    const box = event.currentTarget.getBoundingClientRect();
    const after = event.clientY > box.top + box.height / 2;
    if (dropSpot?.kind !== 'diagram' || dropSpot.targetId !== targetId || dropSpot.after !== after) setDropSpot({ kind: 'diagram', targetId, after });
  }

  function overFolder(event: DragEvent<HTMLElement>, folderId: string | null) {
    if (!draggedId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dropSpot?.kind !== 'folder' || dropSpot.folderId !== folderId) setDropSpot({ kind: 'folder', folderId });
  }

  function drop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (draggedId && dropSpot) {
      if (dropSpot.kind === 'folder') {
        projects().moveDiagramToFolder(draggedId, dropSpot.folderId);
      } else if (dropSpot.targetId !== draggedId) {
        // Soltado junto a otro diagrama: va a la carpeta de ese y a su lado.
        projects().moveDiagramToFolder(draggedId, project!.folderOf[dropSpot.targetId] ?? null);
        projects().moveDiagram(draggedId, dropIndex(dropSpot.targetId, dropSpot.after));
      }
    }
    endDrag();
  }

  function endDrag() {
    setDraggedId(null);
    setDropSpot(null);
  }

  /** Alt+↑ / Alt+↓ sube o baja el diagrama enfocado dentro de su grupo: reordenar sin ratón. */
  function onItemKeyDown(event: KeyboardEvent<HTMLButtonElement>, id: string, siblings: string[]) {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    const neighbor = siblings[siblings.indexOf(id) + (event.key === 'ArrowUp' ? -1 : 1)];
    if (!neighbor) return;
    projects().moveDiagram(id, project!.diagramIds.indexOf(neighbor));
    // El botón se vuelve a montar en su nuevo lugar: se le devuelve el foco.
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-project-diagram="${id}"]`)?.focus());
  }

  function newFolder() {
    const id = projects().createFolder(`Carpeta ${project!.folders.length + 1}`);
    if (id) setRenamingId(id);
  }

  const toggle = (folderId: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });

  const renderList = (items: DiagramSummary[]) => {
    const siblings = items.map((summary) => summary.id);
    return (
      <ul className="space-y-0.5">
        {items.map((summary) => (
          <DiagramItem
            key={summary.id}
            summary={summary}
            active={summary.id === currentId}
            dragging={summary.id === draggedId}
            marker={dropSpot?.kind === 'diagram' && dropSpot.targetId === summary.id && summary.id !== draggedId ? (dropSpot.after ? 'after' : 'before') : null}
            onDragStart={() => setDraggedId(summary.id)}
            onDragOver={(event) => overDiagram(event, summary.id)}
            onDrop={drop}
            onDragEnd={endDrag}
            onKeyDown={(event) => onItemKeyDown(event, summary.id, siblings)}
          />
        ))}
      </ul>
    );
  };

  const sidebar = (
    <aside aria-label="Diagramas del proyecto" className="flex h-full w-[17.5rem] shrink-0 flex-col border-r border-line bg-surface">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <FontAwesomeIcon icon={faFolderOpen} className="text-sm" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-ink-900">{project.name}</h2>
          <p className="text-[11px] text-ink-400">
            {project.diagramIds.length} {project.diagramIds.length === 1 ? 'diagrama' : 'diagramas'}
            {project.folders.length > 0 && ` · ${project.folders.length} ${project.folders.length === 1 ? 'carpeta' : 'carpetas'}`}
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Ocultar navegador del proyecto" title="Ocultar proyecto" className="hidden size-8 items-center justify-center rounded-lg text-ink-400 hover:bg-raised hover:text-ink-900 lg:flex">
          <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
        </button>
        <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar navegador del proyecto" className="flex size-8 items-center justify-center rounded-lg text-ink-400 hover:bg-raised hover:text-ink-900 lg:hidden">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="flex items-center px-2 pb-2 pt-1">
          <p className="text-[11px] font-medium text-ink-400">Diagramas</p>
          <button type="button" onClick={newFolder} title="Nueva carpeta" className="ml-auto flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-ink-400 hover:bg-raised hover:text-accent">
            <FontAwesomeIcon icon={faFolderPlus} className="text-[11px]" /> Carpeta
          </button>
        </div>

        {project.diagramIds.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-4 text-xs leading-relaxed text-ink-600">Añade el diagrama abierto para empezar a navegar el proyecto.</p>
        ) : (
          <div className="space-y-1" aria-describedby="project-order-help">
            {loose.summaries.length > 0 && renderList(loose.summaries)}
            {/* Mientras se arrastra un diagrama de una carpeta, una zona para sacarlo de ella. */}
            {draggedId && project.folderOf[draggedId] && (
              <div
                onDragOver={(event) => overFolder(event, null)}
                onDrop={drop}
                className={`rounded-lg border border-dashed px-3 py-2 text-[11px] ${dropSpot?.kind === 'folder' && dropSpot.folderId === null ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-400'}`}
              >
                Soltar aquí para dejarlo sin carpeta
              </div>
            )}
            {folders.map(({ folder, summaries: items }) => (
              <FolderSection
                key={folder!.id}
                folder={folder!}
                count={items.length}
                collapsed={collapsed.has(folder!.id)}
                renaming={renamingId === folder!.id}
                highlighted={dropSpot?.kind === 'folder' && dropSpot.folderId === folder!.id}
                onToggle={() => toggle(folder!.id)}
                onRename={() => setRenamingId(folder!.id)}
                onRenamed={(name) => {
                  projects().renameFolder(folder!.id, name);
                  setRenamingId(null);
                }}
                onDelete={() => projects().deleteFolder(folder!.id)}
                onDragOver={(event) => overFolder(event, folder!.id)}
                onDrop={drop}
              >
                {items.length === 0 ? (
                  <p className="px-2 py-1.5 text-[11px] text-ink-400">Arrastra diagramas aquí.</p>
                ) : (
                  renderList(items)
                )}
              </FolderSection>
            ))}
          </div>
        )}
        <p id="project-order-help" className="sr-only">Arrastra un diagrama para cambiar su orden o llevarlo a una carpeta, o usa Alt y las flechas arriba y abajo.</p>

        <button
          type="button"
          onClick={() => useUiStore.getState().setGalleryOpen(true, { forProject: true })}
          className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-accent/40 px-3 py-2 text-left text-xs font-medium text-accent hover:bg-accent-soft"
        >
          <FontAwesomeIcon icon={faPlus} />
          Agregar nuevo diagrama
        </button>
        {currentId && !project.diagramIds.includes(currentId) && (
          <button type="button" onClick={addCurrentToProject} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-ink-600 hover:bg-raised hover:text-accent">
            <FontAwesomeIcon icon={faFolderOpen} className="text-[11px]" />
            Añadir el diagrama abierto
          </button>
        )}
      </div>

      <footer className="border-t border-line p-2">
        <button type="button" onClick={() => setProjectMapOpen(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink-900 hover:bg-raised hover:text-accent">
          <FontAwesomeIcon icon={faMap} className="text-[11px]" />
          Mapa del proyecto
        </button>
        <button type="button" onClick={() => setInspectorTab('traceability')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-ink-600 hover:bg-raised hover:text-accent">
          <FontAwesomeIcon icon={faLink} className="text-[11px]" />
          Trazabilidad
          <span className="ml-auto rounded-full bg-accent-soft px-1.5 py-px text-[10px] font-medium text-accent">{project.traceLinks.length + project.diagramRelations.length}</span>
        </button>
        <button type="button" onClick={() => setProjectOpen(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-ink-600 hover:bg-raised hover:text-ink-900">
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

interface FolderSectionProps {
  folder: ProjectFolder;
  count: number;
  collapsed: boolean;
  renaming: boolean;
  highlighted: boolean;
  onToggle: () => void;
  onRename: () => void;
  onRenamed: (name: string) => void;
  onDelete: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  children: ReactNode;
}

/** Una carpeta: se pliega, se renombra (doble clic o lápiz) y recibe diagramas soltados en ella. */
function FolderSection({ folder, count, collapsed, renaming, highlighted, onToggle, onRename, onRenamed, onDelete, onDragOver, onDrop, children }: FolderSectionProps) {
  return (
    <section onDragOver={onDragOver} onDrop={onDrop} className={`rounded-lg ${highlighted ? 'bg-accent-soft/60 ring-1 ring-accent/50' : ''}`}>
      <div className="group flex items-center gap-1 rounded-lg pr-1 hover:bg-raised">
        <button
          type="button"
          onClick={onToggle}
          onDoubleClick={onRename}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
        >
          <FontAwesomeIcon icon={faChevronDown} className={`w-2.5 shrink-0 text-[9px] text-ink-400 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          <FontAwesomeIcon icon={collapsed ? faFolder : faFolderOpen} className="shrink-0 text-xs text-accent" />
          {renaming ? (
            <input
              autoFocus
              defaultValue={folder.name}
              aria-label="Nombre de la carpeta"
              onClick={(event) => event.stopPropagation()}
              onBlur={(event) => onRenamed(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') onRenamed(folder.name);
              }}
              className="min-w-0 flex-1 rounded border border-accent/50 bg-canvas px-1.5 py-0.5 text-[13px] font-medium text-ink-900 outline-none"
            />
          ) : (
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-900">{folder.name}</span>
          )}
          <span className="shrink-0 text-[11px] tabular-nums text-ink-400">{count}</span>
        </button>
        <button type="button" onClick={onRename} aria-label={`Renombrar la carpeta «${folder.name}»`} title="Renombrar" className="flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] text-ink-400 opacity-0 hover:bg-surface hover:text-ink-900 focus-visible:opacity-100 group-hover:opacity-100">
          <FontAwesomeIcon icon={faPen} />
        </button>
        <button type="button" onClick={onDelete} aria-label={`Borrar la carpeta «${folder.name}»`} title="Borrar la carpeta (sus diagramas quedan sin carpeta)" className="flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] text-ink-400 opacity-0 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 group-hover:opacity-100">
          <FontAwesomeIcon icon={faTrashCan} />
        </button>
      </div>
      {!collapsed && <div className="ml-3 border-l border-line pl-1.5">{children}</div>}
    </section>
  );
}

interface DiagramItemProps {
  summary: DiagramSummary;
  active: boolean;
  dragging: boolean;
  marker: 'before' | 'after' | null;
  onDragStart: () => void;
  onDragOver: (event: DragEvent<HTMLLIElement>) => void;
  onDrop: (event: DragEvent<HTMLLIElement>) => void;
  onDragEnd: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

function DiagramItem({ summary, active, dragging, marker, onDragStart, onDragOver, onDrop, onDragEnd, onKeyDown }: DiagramItemProps) {
  return (
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', summary.id);
        onDragStart();
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`relative ${dragging ? 'opacity-40' : ''}`}
    >
      {/* Línea que marca dónde caerá el diagrama arrastrado. */}
      {marker && <span aria-hidden className={`pointer-events-none absolute inset-x-1 h-0.5 rounded-full bg-accent ${marker === 'before' ? '-top-0.5' : '-bottom-0.5'}`} />}
      <button
        type="button"
        data-project-diagram={summary.id}
        onClick={() => openSavedDiagram(summary.id)}
        onKeyDown={onKeyDown}
        aria-current={active ? 'page' : undefined}
        className={`group flex w-full cursor-grab items-start gap-2 rounded-lg px-2 py-2 text-left active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
          active ? 'bg-accent-soft text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'
        }`}
      >
        <FontAwesomeIcon icon={faGripVertical} className="mt-1 shrink-0 text-[10px] text-ink-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{summary.name || 'Sin título'}</span>
          <span className={`block truncate text-[11px] ${active ? 'text-accent/75' : 'text-ink-400'}`}>{diagramRegistry.get(summary.diagramType).displayName}</span>
        </span>
      </button>
    </li>
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

