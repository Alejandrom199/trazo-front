import {
  faBookOpen,
  faCircleInfo,
  faClone,
  faLock,
  faLockOpen,
  faMagnifyingGlass,
  faPen,
  faTrashCan,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useContextMenuStore, type CanvasContextMenu as MenuState } from '@/canvas/contextMenuStore';
import { useElementClickStore } from '@/canvas/elementClickStore';
import { placeArtifact, useAddArtifactAtCenter } from '@/canvas/placeArtifact';
import { useActiveModule } from '@/canvas/useActiveModule';
import { ARTIFACT_CATEGORIES, protectedNodeIds, type ArtifactDefinition, type Diagram } from '@/core/model';
import type { DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { createId } from '@/core/utils/id';
import { ArtifactFigure } from '@/ui/artifacts/ArtifactFigure';
import { ArtifactPopover, type PopoverAnchor } from '@/ui/explanation/ArtifactPopover';
import { searchArtifacts } from '@/ui/palette/artifactSearch';
import { useUiStore } from '@/ui/uiStore';

/**
 * Menú del clic derecho en el lienzo, en un panel de vidrio junto al puntero:
 *   - sobre el fondo: buscador de artefactos; el elegido se crea en el punto del clic.
 *   - sobre un nodo o una flecha: sus acciones (explicar, editar, bloquear, duplicar, eliminar).
 * Se maneja entero con el teclado: ↑ ↓ para moverse, Enter para elegir, Esc para cerrar.
 */
export function CanvasContextMenu() {
  const menu = useContextMenuStore((state) => state.menu);
  const close = useContextMenuStore((state) => state.close);
  const module = useActiveModule();
  const diagram = useDiagramStore((state) => state.diagram);
  if (!menu || !module || !diagram) return null;

  // key: cada apertura empieza de cero (búsqueda vacía, primera opción marcada).
  const key = `${menu.screen.x},${menu.screen.y}`;
  return menu.target.kind === 'pane' ? (
    <ArtifactPicker key={key} menu={menu} module={module} onClose={close} />
  ) : (
    <ElementActions key={key} menu={menu} module={module} diagram={diagram} onClose={close} />
  );
}

const WIDTH = 320;
const VIEWPORT_MARGIN = 12;

/** Panel de vidrio en el punto del menú; si no cabe abajo o a la derecha, se abre hacia el otro lado. */
function MenuShell({
  menu,
  label,
  onClose,
  children,
}: {
  menu: MenuState;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: menu.screen.x, top: menu.screen.y });

  useLayoutEffect(() => {
    const height = ref.current?.offsetHeight ?? 0;
    const { x, y } = menu.screen;
    const left = x + WIDTH + VIEWPORT_MARGIN <= window.innerWidth ? x : Math.max(VIEWPORT_MARGIN, x - WIDTH);
    const top = y + height + VIEWPORT_MARGIN <= window.innerHeight ? y : Math.max(VIEWPORT_MARGIN, y - height);
    setPosition({ left, top });
  }, [menu.screen]);

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => event.key === 'Escape' && onClose();
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      // La explicación que se abre desde el menú (role=dialog) cuenta como parte de él.
      if (!ref.current?.contains(target) && !target.closest('[role="dialog"]')) onClose();
    };
    // Captura: React Flow detiene la propagación de los clics en el lienzo.
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('pointerdown', closeOnOutsideClick, true);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('pointerdown', closeOnOutsideClick, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      data-canvas-menu
      onContextMenu={(event) => event.preventDefault()}
      className="glass-panel fixed z-50 flex max-h-[min(460px,calc(100vh-24px))] flex-col overflow-hidden rounded-xl"
      style={{ ...position, width: WIDTH }}
    >
      {children}
    </div>
  );
}

// ── Fondo del lienzo: buscador de artefactos ───────────────────────────────────

interface PickerSection {
  title: string;
  artifacts: ArtifactDefinition[];
}

function ArtifactPicker({ menu, module, onClose }: { menu: MenuState; module: DiagramModule; onClose: () => void }) {
  const addAtCenter = useAddArtifactAtCenter();
  const recentTypes = useUiStore((state) => state.recentArtifacts);
  const rememberArtifact = useUiStore((state) => state.rememberArtifact);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [info, setInfo] = useState<{ artifact: ArtifactDefinition; anchor: PopoverAnchor } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Solo los artefactos que son nodos: las conexiones se crean uniendo nodos.
  const placeable = useMemo(() => module.artifacts.filter((artifact) => module.nodeKinds[artifact.type]), [module]);
  const sections = useMemo(() => buildSections(placeable, query, recentTypes), [placeable, query, recentTypes]);
  const items = sections.flatMap((section) => section.artifacts);
  const activeIndex = Math.min(active, Math.max(items.length - 1, 0));

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function add(artifact: ArtifactDefinition) {
    if (menu.flow) placeArtifact(module, artifact.type, menu.flow);
    else addAtCenter(artifact.type);
    rememberArtifact(artifact.type);
    onClose();
  }

  function toggleInfo(index: number) {
    const artifact = items[index];
    const row = listRef.current?.querySelector(`[data-index="${index}"]`);
    if (!artifact || !row) return;
    setInfo(info?.artifact.type === artifact.type ? null : { artifact, anchor: row.getBoundingClientRect() });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((activeIndex + step + items.length) % Math.max(items.length, 1));
      setInfo(null);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const artifact = items[activeIndex];
      if (artifact) add(artifact);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      toggleInfo(activeIndex);
    }
  }

  let index = -1;
  return (
    <MenuShell menu={menu} label="Agregar artefacto" onClose={onClose}>
      <div className="flex items-center gap-2.5 border-b border-line/70 px-3.5 py-2.5">
        <FontAwesomeIcon icon={faMagnifyingGlass} className="text-xs text-ink-400" />
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setInfo(null);
          }}
          onKeyDown={onKeyDown}
          placeholder="Buscar artefacto…"
          aria-label="Buscar artefacto"
          aria-controls="canvas-menu-results"
          aria-activedescendant={items[activeIndex] ? `canvas-menu-item-${activeIndex}` : undefined}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
        />
      </div>

      <div ref={listRef} id="canvas-menu-results" role="listbox" className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {items.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-ink-400">Ningún artefacto coincide con «{query.trim()}».</p>
        )}
        {sections.map((section) => (
          <section key={section.title} className="mb-1 last:mb-0">
            <h3 className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{section.title}</h3>
            {section.artifacts.map((artifact) => {
              index += 1;
              const itemIndex = index;
              const kind = module.nodeKinds[artifact.type]!;
              const isActive = itemIndex === activeIndex;
              return (
                <div
                  key={`${section.title}-${artifact.type}`}
                  id={`canvas-menu-item-${itemIndex}`}
                  data-index={itemIndex}
                  role="option"
                  aria-selected={isActive}
                  onMouseMove={() => itemIndex !== activeIndex && setActive(itemIndex)}
                  onClick={() => add(artifact)}
                  className={`group/item flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5 text-[13px] select-none ${
                    isActive ? 'bg-accent-soft text-accent' : 'text-ink-600'
                  }`}
                >
                  <ArtifactFigure kind={kind} artifactType={artifact.type} box={{ width: 36, height: 24 }} />
                  <span className="min-w-0 flex-1 truncate">{artifact.name}</span>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`Qué es ${artifact.name}`}
                    title="Qué es, por qué se usa y cuándo usarlo (Tab)"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleInfo(itemIndex);
                    }}
                    className={`flex size-6 shrink-0 items-center justify-center rounded-md transition-colors hover:text-accent ${
                      info?.artifact.type === artifact.type ? 'text-accent' : isActive ? 'text-ink-400' : 'text-ink-400/40'
                    }`}
                  >
                    <FontAwesomeIcon icon={faCircleInfo} />
                  </button>
                </div>
              );
            })}
          </section>
        ))}
      </div>

      {info && (
        <ArtifactPopover
          artifact={info.artifact}
          anchor={info.anchor}
          footer="Pulsa Enter o haz clic en el artefacto para agregarlo."
          keepOpenOn={(target) => target.closest('[data-canvas-menu]') !== null}
          onClose={() => setInfo(null)}
        />
      )}
    </MenuShell>
  );
}

/**
 * Sin búsqueda: primero los recientes y luego todo por categoría.
 * Con búsqueda: una sola lista ordenada por relevancia.
 */
function buildSections(placeable: ArtifactDefinition[], query: string, recentTypes: string[]): PickerSection[] {
  if (query.trim()) return [{ title: 'Resultados', artifacts: searchArtifacts(placeable, query) }];

  const recent = recentTypes
    .map((type) => placeable.find((artifact) => artifact.type === type))
    .filter((artifact): artifact is ArtifactDefinition => artifact !== undefined);
  const byCategory = ARTIFACT_CATEGORIES.map(({ category, shortTitle }) => ({
    title: shortTitle,
    artifacts: placeable.filter((artifact) => artifact.category === category),
  }));
  return [{ title: 'Recientes', artifacts: recent }, ...byCategory].filter((section) => section.artifacts.length > 0);
}

// ── Nodo o flecha: acciones ────────────────────────────────────────────────────

interface Action {
  id: string;
  label: string;
  icon: IconDefinition;
  /** Atajo equivalente, como recordatorio. */
  shortcut?: string;
  danger?: boolean;
  /** Si no se puede, el motivo (se muestra como pista y la acción queda deshabilitada). */
  disabledReason?: string;
  run: () => void;
}

function ElementActions({
  menu,
  module,
  diagram,
  onClose,
}: {
  menu: MenuState;
  module: DiagramModule;
  diagram: Diagram;
  onClose: () => void;
}) {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const actions = menu.target.kind === 'pane' ? [] : buildActions(menu, module, diagram);
  const enabled = actions.map((action, index) => (action.disabledReason ? -1 : index)).filter((index) => index >= 0);

  useEffect(() => ref.current?.focus(), []);

  function run(action: Action) {
    if (action.disabledReason) return;
    onClose();
    action.run();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const position = enabled.indexOf(active);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive(enabled[(position + step + enabled.length) % enabled.length] ?? 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const action = actions[active];
      if (action) run(action);
    }
  }

  const element =
    menu.target.kind === 'node'
      ? diagram.nodes.find((node) => node.id === (menu.target as { id: string }).id)
      : diagram.edges.find((edge) => edge.id === (menu.target as { id: string }).id);
  const definition = element && module.artifacts.find((artifact) => artifact.type === element.artifactType);
  const label = element && 'label' in element ? element.label.trim() : '';

  return (
    <MenuShell menu={menu} label="Acciones del elemento" onClose={onClose}>
      <header className="border-b border-line/70 px-3.5 py-2.5">
        <p className="truncate text-sm font-semibold text-ink-900">{definition?.name ?? 'Elemento'}</p>
        {label && <p className="truncate text-xs text-ink-400">«{label}»</p>}
      </header>
      <div ref={ref} tabIndex={-1} onKeyDown={onKeyDown} className="p-1.5 outline-none">
        {actions.map((action, index) => (
          <button
            key={action.id}
            type="button"
            role="menuitem"
            disabled={action.disabledReason !== undefined}
            title={action.disabledReason}
            onMouseMove={() => !action.disabledReason && setActive(index)}
            onClick={() => run(action)}
            className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13px] disabled:cursor-not-allowed disabled:opacity-40 ${
              index === active && !action.disabledReason
                ? action.danger
                  ? 'bg-danger-soft text-danger'
                  : 'bg-accent-soft text-accent'
                : action.danger
                  ? 'text-danger'
                  : 'text-ink-600'
            }`}
          >
            <FontAwesomeIcon icon={action.icon} className="w-3.5 text-xs" />
            <span className="flex-1">{action.label}</span>
            {action.shortcut && <span className="text-[11px] text-ink-400">{action.shortcut}</span>}
          </button>
        ))}
      </div>
    </MenuShell>
  );
}

function buildActions(menu: MenuState, module: DiagramModule, diagram: Diagram): Action[] {
  if (menu.target.kind === 'pane') return [];
  const { kind: targetKind, id } = menu.target;
  const store = useDiagramStore.getState();
  const point = { left: menu.screen.x, top: menu.screen.y, right: menu.screen.x, bottom: menu.screen.y };

  const explain: Action = {
    id: 'explain',
    label: 'Explicar qué es',
    icon: faBookOpen,
    run: () => {
      useUiStore.getState().setPopoverTab('explanation');
      useElementClickStore.getState().setClicked({ kind: targetKind, id, rect: point });
      useElementClickStore.getState().setExpanded(true);
    },
  };

  if (targetKind === 'edge') {
    const edge = diagram.edges.find((candidate) => candidate.id === id);
    if (!edge) return [];
    const edgeKind = module.edgeKinds[edge.artifactType];
    const editLabel = edgeKind?.text === 'guard' ? 'Escribir guarda' : `Escribir ${(edgeKind?.textCaption ?? 'texto').toLowerCase()}`;
    return [
      explain,
      ...(edgeKind?.text ? [{ id: 'edit', label: editLabel, icon: faPen, shortcut: 'Doble clic', run: () => store.startEditingEdge(id) }] : []),
      { id: 'delete', label: 'Eliminar', icon: faTrashCan, shortcut: 'Supr', danger: true, run: () => store.removeElements({ nodeIds: [], edgeIds: [id] }) },
    ];
  }

  const node = diagram.nodes.find((candidate) => candidate.id === id);
  const kind = node && module.nodeKinds[node.artifactType];
  if (!node || !kind) return [];
  const isProtected = protectedNodeIds(diagram).has(id);

  return [
    explain,
    ...(kind.hasLabel
      ? [{ id: 'edit', label: `Editar ${(kind.labelCaption ?? 'nombre').toLowerCase()}`, icon: faPen, shortcut: 'Doble clic', run: () => store.startEditing(id) }]
      : []),
    {
      id: 'lock',
      label: node.locked ? 'Desbloquear' : 'Bloquear',
      icon: node.locked ? faLockOpen : faLock,
      run: () => store.updateNode(id, { locked: !node.locked }),
    },
    {
      id: 'duplicate',
      label: kind.isContainer ? 'Duplicar (sin su contenido)' : 'Duplicar',
      icon: faClone,
      run: () => {
        const copy = { ...node, id: createId(), position: { x: node.position.x + DUPLICATE_OFFSET, y: node.position.y + DUPLICATE_OFFSET }, props: { ...node.props }, locked: false };
        store.addNode(copy);
        store.setSelection({ nodeIds: [copy.id], edgeIds: [] });
      },
    },
    {
      id: 'delete',
      label: 'Eliminar',
      icon: faTrashCan,
      shortcut: 'Supr',
      danger: true,
      disabledReason: isProtected
        ? node.locked
          ? 'Está bloqueado: desbloquéalo para eliminarlo'
          : 'Contiene un elemento bloqueado'
        : undefined,
      run: () => store.removeElements({ nodeIds: [id], edgeIds: [] }),
    },
  ];
}

/** Separación de la copia respecto del original, para que se vea que hay dos. */
const DUPLICATE_OFFSET = 24;
