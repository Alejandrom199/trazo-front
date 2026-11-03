import {
  faAnglesLeft,
  faAnglesRight,
  faBolt,
  faCircleInfo,
  faCodeBranch,
  faCube,
  faFileCode,
  faMagnifyingGlass,
  faNoteSticky,
  faObjectGroup,
  faPlug,
  faPuzzlePiece,
  faServer,
  faShapes,
  faTableColumns,
  faTimeline,
  faUser,
  faXmark,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { ARTIFACT_CATEGORIES, type ArtifactCategory, type ArtifactDefinition } from '@/core/model';
import type { EdgeKind, NodeKind } from '@/core/registry';
import { useCanvasInteractionStore } from '@/canvas/canvasInteractionStore';
import { useContextMenuStore } from '@/canvas/contextMenuStore';
import { ARTIFACT_DRAG_MIME } from '@/canvas/dragAndDrop';
import { useAddArtifactAtCenter } from '@/canvas/placeArtifact';
import { useActiveModule } from '@/canvas/useActiveModule';
import { ArtifactFigure } from '@/ui/artifacts/ArtifactFigure';
import { EdgeFigure } from '@/ui/artifacts/EdgeFigure';
import { ArtifactPopover } from '@/ui/explanation/ArtifactPopover';
import { searchArtifacts } from './artifactSearch';
import { NARROW_QUERY, useMediaQuery } from '@/ui/useMediaQuery';
import { useUiStore } from '@/ui/uiStore';

/** Icono de cada categoría en la paleta plegada; las que no estén aquí usan uno genérico. */
const CATEGORY_ICONS: Partial<Record<ArtifactCategory, IconDefinition>> = {
  'nodo de control': faCodeBranch,
  'nodo ejecutable': faBolt,
  'nodo de objeto': faCube,
  agrupación: faTableColumns,
  anotación: faNoteSticky,
  participante: faUser,
  ocurrencia: faTimeline,
  'fragmento combinado': faObjectGroup,
  componente: faPuzzlePiece,
  interfaz: faPlug,
  infraestructura: faServer,
  'artefacto desplegable': faFileCode,
};

const TIP_SEEN_KEY = 'trazo.contextMenuTipSeen';

/**
 * Paleta de artefactos del módulo activo, agrupada por categoría y con buscador.
 * Clic (o arrastrar) agrega el artefacto al lienzo; el botón (i) abre su explicación.
 * Pasar el ratón muestra una pista corta. Plegada, queda un riel con un icono por
 * categoría (cada uno despliega sus artefactos) y una lupa que abre el buscador
 * del lienzo, el mismo del clic derecho.
 */
export function PalettePanel() {
  const module = useActiveModule();
  const hint = usePaletteHint();
  const addAtCenter = useAddArtifactAtCenter();
  const [opened, setOpened] = useState<HintState | null>(null);
  const [query, setQuery] = useState('');
  const [flyout, setFlyout] = useState<{ category: ArtifactCategory; anchor: DOMRect } | null>(null);
  const rememberArtifact = useUiStore((state) => state.rememberArtifact);
  const nextEdgeType = useCanvasInteractionStore((state) => state.nextEdgeType);
  const setNextEdgeType = useCanvasInteractionStore((state) => state.setNextEdgeType);
  useContextMenuTip();
  const collapsed = useUiStore((state) => state.paletteCollapsed);
  const setCollapsed = useUiStore((state) => state.setPaletteCollapsed);
  const isNarrow = useMediaQuery(NARROW_QUERY);
  if (!module) return null;

  function toggleExplanation(artifact: ArtifactDefinition, anchor: DOMRect) {
    hint.hide();
    setOpened(opened?.artifact.type === artifact.type ? null : { artifact, anchor });
  }

  const draggable = module.artifacts.filter((artifact) => module.nodeKinds[artifact.type]);
  const connectors = module.artifacts.filter((artifact) => module.edgeKinds[artifact.type]);
  const categories = ARTIFACT_CATEGORIES.filter(({ category }) => draggable.some((artifact) => artifact.category === category));
  const searching = query.trim() !== '';
  const results = searching ? searchArtifacts(draggable, query) : [];

  function add(artifactType: string) {
    hint.hide();
    addAtCenter(artifactType);
    rememberArtifact(artifactType);
  }

  /** La lupa del riel abre el buscador del lienzo junto a ella; lo elegido va al centro de la vista. */
  function openSearch(anchor: DOMRect) {
    setFlyout(null);
    useContextMenuStore.getState().open({ target: { kind: 'pane' }, screen: { x: anchor.right + 8, y: anchor.top }, flow: null });
  }

  if (collapsed) {
    return (
      <aside aria-label="Artefactos" className="flex h-full w-14 shrink-0 flex-col items-center border-r border-line bg-surface">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Mostrar artefactos"
          aria-label="Mostrar artefactos"
          aria-expanded={false}
          className="mt-3 mb-2 flex size-8 items-center justify-center rounded-md text-xs text-ink-400 hover:bg-raised hover:text-ink-900"
        >
          <FontAwesomeIcon icon={faAnglesRight} />
        </button>
        <div className="flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto px-1.5 pb-3">
          {categories.map(({ category, shortTitle }) => {
            const isOpen = flyout?.category === category;
            return (
              <button
                key={category}
                type="button"
                data-palette-category
                onClick={(event) => setFlyout(isOpen ? null : { category, anchor: event.currentTarget.getBoundingClientRect() })}
                title={shortTitle}
                aria-label={shortTitle}
                aria-expanded={isOpen}
                className={`flex size-10 items-center justify-center rounded-lg text-sm transition-colors ${
                  isOpen ? 'bg-accent-soft text-accent' : 'text-ink-400 hover:bg-raised hover:text-ink-900'
                }`}
              >
                <FontAwesomeIcon icon={CATEGORY_ICONS[category] ?? faShapes} />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={(event) => openSearch(event.currentTarget.getBoundingClientRect())}
          title="Buscar artefacto (también con clic derecho en el lienzo)"
          aria-label="Buscar artefacto"
          className="mb-3 flex size-10 items-center justify-center rounded-lg text-sm text-ink-400 hover:bg-raised hover:text-ink-900"
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        </button>
        {flyout && (
          <CategoryFlyout
            title={categories.find((entry) => entry.category === flyout.category)?.shortTitle ?? ''}
            anchor={flyout.anchor}
            onClose={() => setFlyout(null)}
          >
            {draggable
              .filter((artifact) => artifact.category === flyout.category)
              .map((artifact) => {
                const kind = module.nodeKinds[artifact.type];
                return kind ? (
                  <PaletteItem
                    key={artifact.type}
                    artifact={artifact}
                    kind={kind}
                    isOpen={opened?.artifact.type === artifact.type}
                    onHover={undefined}
                    onLeave={hint.hide}
                    onAdd={() => {
                      add(artifact.type);
                      setFlyout(null);
                    }}
                    onDragEnd={() => setFlyout(null)}
                    onInfo={toggleExplanation}
                  />
                ) : null;
              })}
          </CategoryFlyout>
        )}
        {opened && (
          <ArtifactPopover
            artifact={opened.artifact}
            anchor={opened.anchor}
            footer="Haz clic en el artefacto o arrástralo para agregarlo al lienzo."
            keepOpenOn={isPaletteInfo}
            onClose={() => setOpened(null)}
          />
        )}
        {hint.current && <PaletteHint artifact={hint.current.artifact} anchor={hint.current.anchor} />}
      </aside>
    );
  }

  return (
    <aside
      aria-label="Artefactos"
      className="flex h-full w-64 shrink-0 flex-col border-r border-line bg-surface max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:shadow-panel"
    >
      <header className="flex items-start gap-2 px-5 pt-5 pb-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-ink-900">Artefactos</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpened(null);
            setCollapsed(true);
          }}
          title="Plegar artefactos"
          aria-label="Plegar artefactos"
          aria-expanded
          className="-mr-2 flex size-8 shrink-0 items-center justify-center rounded-md text-xs text-ink-400 hover:bg-raised hover:text-ink-900"
        >
          <FontAwesomeIcon icon={faAnglesLeft} />
        </button>
      </header>

      <div className="px-4 pt-1 pb-1">
        <label className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-2.5 py-1.5 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/15">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[11px] text-ink-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Escape' && setQuery('')}
            placeholder="Buscar artefacto…"
            aria-label="Buscar artefacto"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink-900 outline-none placeholder:text-ink-400"
          />
          {searching && (
            <button type="button" onClick={() => setQuery('')} aria-label="Borrar búsqueda" className="text-[11px] text-ink-400 hover:text-ink-900">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </label>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {searching && results.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-ink-400">Ningún artefacto coincide con «{query.trim()}».</p>
        )}
        {(searching ? [{ category: 'resultados', shortTitle: 'Resultados' }] : categories).map(({ category, shortTitle: title }) => {
          const items = searching ? results : draggable.filter((artifact) => artifact.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category} className="mt-3">
              <h3 className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{title}</h3>
              {items.map((artifact) => {
                const kind = module.nodeKinds[artifact.type];
                return kind ? (
                  <PaletteItem
                    key={artifact.type}
                    artifact={artifact}
                    kind={kind}
                    isOpen={opened?.artifact.type === artifact.type}
                    onHover={opened ? undefined : hint.show}
                    onLeave={hint.hide}
                    onAdd={() => {
                      add(artifact.type);
                      // En móvil la paleta flota sobre el lienzo: se pliega para ver lo agregado.
                      if (isNarrow) setCollapsed(true);
                    }}
                    onInfo={toggleExplanation}
                  />
                ) : null;
              })}
            </section>
          );
        })}

        {connectors.length > 0 && !searching && (
          <section className="mt-3">
            <h3 className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Conexiones</h3>
            <p className="px-2 pb-2 text-xs leading-relaxed text-ink-400">
              Arrastra desde un punto de un nodo hasta otro. Elige aquí el tipo para las próximas flechas; si no eliges, se deduce solo.
            </p>
            {connectors.map((artifact) => (
              <ConnectorItem
                key={artifact.type}
                artifact={artifact}
                kind={module.edgeKinds[artifact.type]}
                chosen={nextEdgeType === artifact.type}
                isOpen={opened?.artifact.type === artifact.type}
                onChoose={() => setNextEdgeType(nextEdgeType === artifact.type ? null : artifact.type)}
                onInfo={toggleExplanation}
              />
            ))}
          </section>
        )}
      </div>

      {hint.current && !opened && <PaletteHint artifact={hint.current.artifact} anchor={hint.current.anchor} />}
      {opened && (
        <ArtifactPopover
          artifact={opened.artifact}
          anchor={opened.anchor}
          footer="Haz clic en el artefacto o arrástralo para agregarlo al lienzo."
          keepOpenOn={isPaletteInfo}
          onClose={() => setOpened(null)}
        />
      )}
    </aside>
  );
}

/** Un clic en otra (i) de la paleta cambia de explicación (o la cierra) en vez de cerrarla desde fuera. */
const isPaletteInfo = (target: HTMLElement) => target.closest('[data-palette-info]') !== null;

/** Espera antes de mostrar la pista, para que no parpadee al recorrer la lista. */
const HINT_DELAY_MS = 350;

interface HintState {
  artifact: ArtifactDefinition;
  anchor: DOMRect;
}

function usePaletteHint() {
  const [current, setCurrent] = useState<HintState | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return {
    current,
    show: (artifact: ArtifactDefinition, anchor: DOMRect) => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCurrent({ artifact, anchor }), HINT_DELAY_MS);
    },
    hide: () => {
      window.clearTimeout(timer.current);
      setCurrent(null);
    },
  };
}

/** Explicación corta junto a la paleta: qué es y cómo se reconoce. */
function PaletteHint({ artifact, anchor }: HintState) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 w-64 rounded-lg border border-line bg-surface px-3.5 py-3 shadow-panel"
      style={{ left: anchor.right + 12, top: anchor.top - 4 }}
    >
      <p className="text-sm font-semibold text-ink-900">{artifact.name}</p>
      <p className="mb-1.5 text-[11px] text-ink-400">Nombre UML: {artifact.umlName}</p>
      <p className="text-xs leading-relaxed text-ink-600">{artifact.whatIs}</p>
      <p className="mt-2 text-[11px] text-ink-400">Clic para agregarlo. La (i) explica por qué y cuándo usarlo.</p>
    </div>
  );
}

/** Caja de la miniatura en cada fila de la paleta. */
const PREVIEW = { width: 44, height: 30 };

interface PaletteItemProps {
  artifact: ArtifactDefinition;
  kind: NodeKind;
  isOpen: boolean;
  /** Versión plegada: solo la miniatura, sin nombre ni (i). */
  compact?: boolean;
  /** undefined mientras hay un popup abierto: no se mezclan pista y popup. */
  onHover: ((artifact: ArtifactDefinition, anchor: DOMRect) => void) | undefined;
  onLeave: () => void;
  /** Agrega el artefacto al lienzo. */
  onAdd: () => void;
  /** Abre (o cierra) su explicación, junto a la fila. */
  onInfo: (artifact: ArtifactDefinition, anchor: DOMRect) => void;
  onDragEnd?: () => void;
}

function PaletteItem({ artifact, kind, isOpen, compact = false, onHover, onLeave, onAdd, onInfo, onDragEnd }: PaletteItemProps) {
  function handleDragStart(event: DragEvent) {
    onLeave();
    event.dataTransfer.setData(ARTIFACT_DRAG_MIME, artifact.type);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div
      draggable
      data-palette-item
      role="button"
      tabIndex={0}
      aria-label={`Agregar ${artifact.name} al lienzo`}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={(event) => onHover?.(artifact, event.currentTarget.getBoundingClientRect())}
      onMouseLeave={onLeave}
      onClick={onAdd}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onAdd();
      }}
      className={`group/item relative flex cursor-grab items-center rounded-md text-[13px] select-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none ${
        compact ? 'w-full justify-center py-2' : 'gap-3 px-2 py-1.5'
      } ${isOpen ? 'bg-accent-soft font-medium text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'}`}
    >
      {isOpen && <span className="bg-brand absolute top-1 bottom-1 -left-3 w-[3px] rounded-r-full" aria-hidden />}
      <ArtifactFigure kind={kind} artifactType={artifact.type} box={PREVIEW} />
      {!compact && <span className="min-w-0 flex-1 truncate">{artifact.name}</span>}
      {!compact && (
        <button
          type="button"
          draggable={false}
          data-palette-info
          aria-label={`Qué es ${artifact.name}`}
          aria-expanded={isOpen}
          title="Qué es, por qué se usa y cuándo usarlo"
          onClick={(event) => {
            // Que el clic en la (i) no agregue el artefacto.
            event.stopPropagation();
            const row = event.currentTarget.closest('[data-palette-item]');
            if (row) onInfo(artifact, row.getBoundingClientRect());
          }}
          onKeyDown={(event) => event.stopPropagation()}
          className={`flex size-6 shrink-0 items-center justify-center rounded-md text-[13px] transition-colors ${
            // Semitransparente en reposo para no competir con el nombre; se aviva al pasar el ratón.
            isOpen ? 'text-accent' : 'text-ink-400/50 hover:bg-surface hover:text-accent group-hover/item:text-ink-400'
          }`}
        >
          <FontAwesomeIcon icon={faCircleInfo} />
        </button>
      )}
    </div>
  );
}

/**
 * Desplegable de una categoría junto al riel plegado, en vidrio. Se cierra con
 * Escape, al hacer clic fuera o al agregar un artefacto.
 */
function CategoryFlyout({ title, anchor, onClose, children }: { title: string; anchor: DOMRect; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      // Otro icono del riel cambia de categoría; la (i) abre su explicación sin cerrar esto.
      if (ref.current?.contains(target) || target.closest('[data-palette-category], [role="dialog"]')) return;
      onClose();
    };
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
      role="group"
      aria-label={title}
      className="glass-panel fixed z-40 w-60 rounded-xl p-1.5"
      style={{ left: anchor.right + 10, top: Math.max(12, Math.min(anchor.top - 8, window.innerHeight - 360)) }}
    >
      <h3 className="px-2 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{title}</h3>
      {children}
    </div>
  );
}

/** La primera vez que se abre el editor, cuenta que también se puede agregar con clic derecho. */
function useContextMenuTip() {
  const showNotice = useUiStore((state) => state.showNotice);
  useEffect(() => {
    try {
      if (localStorage.getItem(TIP_SEEN_KEY)) return;
      localStorage.setItem(TIP_SEEN_KEY, 'true');
    } catch {
      // Sin almacenamiento no se puede recordar: mejor no repetir el aviso en cada visita.
      return;
    }
    const timer = window.setTimeout(() => showNotice('Consejo: haz clic derecho en el lienzo para buscar y agregar artefactos.'), 1500);
    return () => window.clearTimeout(timer);
  }, [showNotice]);
}

/**
 * Un conector en la paleta: su figura real (punta, rombo, trazo), su nombre y su
 * (i). Clic lo elige para las próximas flechas (otro clic lo suelta).
 */
function ConnectorItem({
  artifact,
  kind,
  chosen,
  isOpen,
  onChoose,
  onInfo,
}: {
  artifact: ArtifactDefinition;
  kind: EdgeKind | undefined;
  chosen: boolean;
  isOpen: boolean;
  onChoose: () => void;
  onInfo: (artifact: ArtifactDefinition, anchor: DOMRect) => void;
}) {
  return (
    <div
      data-palette-item
      role="button"
      tabIndex={0}
      aria-pressed={chosen}
      title={chosen ? 'Elegido para las próximas flechas. Clic para volver a deducirlo solo' : 'Usar este tipo en las próximas flechas'}
      onClick={onChoose}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onChoose();
      }}
      className={`group/item relative flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-[13px] select-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none ${
        chosen || isOpen ? 'bg-accent-soft font-medium text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'
      }`}
    >
      <span className="trazo-figure flex w-10 justify-center">
        <EdgeFigure kind={kind} box={{ width: 40, height: 18 }} />
      </span>
      <span className="min-w-0 flex-1 truncate">{artifact.name}</span>
      <button
        type="button"
        data-palette-info
        aria-label={`Qué es ${artifact.name}`}
        aria-expanded={isOpen}
        title="Qué es, por qué se usa y cuándo usarlo"
        onClick={(event) => {
          event.stopPropagation();
          const row = event.currentTarget.closest('[data-palette-item]');
          if (row) onInfo(artifact, row.getBoundingClientRect());
        }}
        onKeyDown={(event) => event.stopPropagation()}
        className={`flex size-6 shrink-0 items-center justify-center rounded-md text-[13px] transition-colors ${
          isOpen ? 'text-accent' : 'text-ink-400/50 hover:bg-surface hover:text-accent group-hover/item:text-ink-400'
        }`}
      >
        <FontAwesomeIcon icon={faCircleInfo} />
      </button>
    </div>
  );
}
