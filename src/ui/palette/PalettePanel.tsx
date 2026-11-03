import {
  faArrowRightLong,
  faBolt,
  faCircleDot,
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
  faSquare,
  faTableColumns,
  faTimeline,
  faUser,
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
import { useUiStore } from '@/ui/uiStore';

/** Icono de cada categoría en la tira de herramientas; las que no estén aquí usan uno genérico. */
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
  estado: faSquare,
  pseudoestado: faCircleDot,
};

const TIP_SEEN_KEY = 'trazo.contextMenuTipSeen';

/** Clave del desplegable de conexiones (no es una categoría de nodos). */
const CONNECTORS = 'conexiones';
type FlyoutKey = ArtifactCategory | typeof CONNECTORS;

/**
 * Herramientas de dibujo del módulo activo: una tira vertical que flota sobre el
 * lienzo, con un icono por categoría y otro para las conexiones. Cada uno
 * despliega sus artefactos con su figura, su nombre y la (i) que los explica;
 * clic o arrastrar agrega el artefacto. La lupa abre el buscador del lienzo, el
 * mismo del clic derecho. Así el lienzo conserva todo el ancho.
 */
export function PalettePanel() {
  const module = useActiveModule();
  const addAtCenter = useAddArtifactAtCenter();
  const [opened, setOpened] = useState<HintState | null>(null);
  const [flyout, setFlyout] = useState<{ key: FlyoutKey; anchor: DOMRect } | null>(null);
  const rememberArtifact = useUiStore((state) => state.rememberArtifact);
  const nextEdgeType = useCanvasInteractionStore((state) => state.nextEdgeType);
  const setNextEdgeType = useCanvasInteractionStore((state) => state.setNextEdgeType);
  useContextMenuTip();
  if (!module) return null;

  function toggleExplanation(artifact: ArtifactDefinition, anchor: DOMRect) {
    setOpened(opened?.artifact.type === artifact.type ? null : { artifact, anchor });
  }

  const draggable = module.artifacts.filter((artifact) => module.nodeKinds[artifact.type]);
  const connectors = module.artifacts.filter((artifact) => module.edgeKinds[artifact.type]);
  const categories = ARTIFACT_CATEGORIES.filter(({ category }) => draggable.some((artifact) => artifact.category === category));
  const chosenConnector = connectors.find((artifact) => artifact.type === nextEdgeType);

  function add(artifactType: string) {
    addAtCenter(artifactType);
    rememberArtifact(artifactType);
  }

  /** La lupa abre el buscador del lienzo junto a ella; lo elegido va al centro de la vista. */
  function openSearch(anchor: DOMRect) {
    setFlyout(null);
    useContextMenuStore.getState().open({ target: { kind: 'pane' }, screen: { x: anchor.right + 8, y: anchor.top }, flow: null });
  }

  const toolButton = (key: FlyoutKey, title: string, icon: IconDefinition, active = false) => {
    const isOpen = flyout?.key === key;
    return (
      <button
        key={key}
        type="button"
        data-palette-category
        onClick={(event) => setFlyout(isOpen ? null : { key, anchor: event.currentTarget.closest('aside')!.getBoundingClientRect() })}
        aria-expanded={isOpen}
        className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition-colors ${
          isOpen || active ? 'bg-accent-soft font-medium text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'
        }`}
      >
        <span className="flex w-4 shrink-0 justify-center text-xs">
          <FontAwesomeIcon icon={icon} />
        </span>
        <span className="min-w-0 flex-1 truncate">{title}</span>
      </button>
    );
  };

  return (
    // Sin backdrop-filter: haría que los desplegables (position: fixed) se ubiquen respecto a la tira y no a la pantalla.
    <aside aria-label="Artefactos" className="flex w-40 flex-col gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-panel">
      {categories.map(({ category, shortTitle }) => toolButton(category, shortTitle, CATEGORY_ICONS[category] ?? faShapes))}
      {connectors.length > 0 &&
        toolButton(CONNECTORS, chosenConnector ? chosenConnector.name : 'Conexiones', faArrowRightLong, chosenConnector !== undefined)}
      <span className="mx-2 my-0.5 h-px bg-line" aria-hidden />
      <button
        type="button"
        onClick={(event) => openSearch(event.currentTarget.closest('aside')!.getBoundingClientRect())}
        title="También con clic derecho en el lienzo"
        className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-ink-600 hover:bg-raised hover:text-ink-900"
      >
        <span className="flex w-4 shrink-0 justify-center text-xs">
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        </span>
        Buscar
      </button>

      {flyout && flyout.key !== CONNECTORS && (
        <CategoryFlyout title={categories.find((entry) => entry.category === flyout.key)?.shortTitle ?? ''} anchor={flyout.anchor} onClose={() => setFlyout(null)}>
          {draggable
            .filter((artifact) => artifact.category === flyout.key)
            .map((artifact) => {
              const kind = module.nodeKinds[artifact.type];
              return kind ? (
                <PaletteItem
                  key={artifact.type}
                  artifact={artifact}
                  kind={kind}
                  isOpen={opened?.artifact.type === artifact.type}
                  onHover={undefined}
                  onLeave={() => undefined}
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
      {flyout?.key === CONNECTORS && (
        <CategoryFlyout title="Conexiones" anchor={flyout.anchor} onClose={() => setFlyout(null)}>
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
    </aside>
  );
}

/** Un clic en otra (i) de la paleta cambia de explicación (o la cierra) en vez de cerrarla desde fuera. */
const isPaletteInfo = (target: HTMLElement) => target.closest('[data-palette-info]') !== null;

interface HintState {
  artifact: ArtifactDefinition;
  anchor: DOMRect;
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
      style={{ left: anchor.right + 8, top: Math.max(12, Math.min(anchor.top, window.innerHeight - 360)) }}
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
