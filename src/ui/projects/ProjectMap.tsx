import {
  faArrowRight,
  faCircleCheck,
  faCircleExclamation,
  faCompress,
  faFolder,
  faMagnifyingGlass,
  faMap,
  faMinus,
  faPlus,
  faUpRightFromSquare,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  buildMapEdges,
  MAP_PHASES,
  PHASE_OF,
  validateDiagram,
  validateProject,
  type Diagram,
  type DiagramProject,
  type MapEdge,
  type MapEdgeKind,
} from '@/core/model';
import { diagramRegistry } from '@/core/registry';
import { useProjectStore } from '@/core/store/projectStore';
import { projectRules } from '@/diagrams/crossDiagram';
import { normalizeName } from '@/diagrams/crossDiagram/names';
import { useDialogBehavior } from '@/ui/dialogs/useDialogBehavior';
import { useUiStore } from '@/ui/uiStore';
import {
  arrowBetween,
  CARD_HEIGHT,
  CARD_WIDTH,
  COLUMN_WIDTH,
  columnLeft,
  fitViewport,
  laneOf,
  layoutMap,
  zoomAround,
  type PlacedCard,
  type Viewport,
} from './mapLayout';
import { openSavedDiagram } from './projectActions';
import { useProjectDiagrams } from './useProjectDiagrams';

const KINDS: MapEdgeKind[] = ['subprocess', 'relation', 'trace'];
const EDGE_STYLE: Record<MapEdgeKind, { name: string; color: string; dash?: string }> = {
  subprocess: { name: 'Subprocesos', color: 'var(--color-accent)' },
  relation: { name: 'Relaciones entre diagramas', color: 'var(--color-success)' },
  trace: { name: 'Vínculos entre elementos', color: 'var(--color-info)', dash: '6 5' },
};
const ZOOM_STEP = 1.2;

/**
 * Mapa del proyecto: cada diagrama es una tarjeta en la columna de su fase y
 * las flechas muestran cómo se relacionan. Se calcula de los datos (nunca queda
 * viejo). Se recorre como un lienzo (arrastrar o rueda para moverse, Ctrl+rueda
 * o los botones para el zoom); un clic elige una tarjeta y muestra sus
 * relaciones en el panel; doble clic (o «Abrir») abre el diagrama.
 */
export function ProjectMap() {
  const open = useUiStore((state) => state.projectMapOpen);
  const project = useProjectStore((state) => state.project);
  if (!open || !project) return null;
  return <MapDialog project={project} />;
}

function MapDialog({ project }: { project: DiagramProject }) {
  const allDiagrams = useProjectDiagrams();
  const close = useCallback(() => useUiStore.getState().setProjectMapOpen(false), []);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(true, dialogRef, close);
  const [folderFilter, setFolderFilter] = useState('all');
  const [hiddenKinds, setHiddenKinds] = useState<ReadonlySet<MapEdgeKind>>(new Set());
  const [query, setQuery] = useState('');
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Memorizado: si cambiara en cada render, el mapa se volvería a encuadrar solo.
  const diagrams = useMemo(
    () => (folderFilter === 'all' ? allDiagrams : allDiagrams.filter((diagram) => (project.folderOf[diagram.id] ?? 'none') === folderFilter)),
    [allDiagrams, folderFilter, project.folderOf],
  );
  const allEdges = useMemo(() => buildMapEdges(diagrams, project), [diagrams, project]);
  const edges = allEdges.filter((edge) => !hiddenKinds.has(edge.kind));
  const layout = useMemo(() => layoutMap(diagrams), [diagrams]);
  const problems = useMemo(() => problemCounts(allDiagrams, project), [allDiagrams, project]);
  const matches = useMemo(() => {
    const wanted = normalizeName(query);
    return wanted ? new Set(diagrams.filter((diagram) => normalizeName(diagram.name).includes(wanted)).map((diagram) => diagram.id)) : null;
  }, [diagrams, query]);
  const selected = selectedId ? diagrams.find((diagram) => diagram.id === selectedId) : undefined;
  // Lo enfocado (pasando el ratón o elegido) resalta sus flechas y atenúa el resto.
  const focusId = hovered ?? selected?.id ?? null;

  function openDiagram(id: string) {
    close();
    openSavedDiagram(id);
  }
  function createInPhase() {
    close();
    useUiStore.getState().setGalleryOpen(true, { forProject: true });
  }
  const toggleKind = (kind: MapEdgeKind) =>
    setHiddenKinds((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="project-map-title" tabIndex={-1} className="fixed inset-0 z-50 flex flex-col bg-canvas outline-none">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><FontAwesomeIcon icon={faMap} /></span>
          <div className="min-w-0">
            <h2 id="project-map-title" className="truncate text-sm font-semibold text-ink-900">Mapa de «{project.name}»</h2>
            <p className="text-[11px] text-ink-400">{diagrams.length} diagramas · {allEdges.length} relaciones</p>
          </div>
        </div>

        <label className="flex h-9 w-56 items-center gap-2 rounded-lg border border-line bg-canvas px-2.5 focus-within:border-accent">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[11px] text-ink-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar diagrama" aria-label="Buscar diagrama" className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Borrar la búsqueda" className="text-[11px] text-ink-400 hover:text-ink-900"><FontAwesomeIcon icon={faXmark} /></button>}
        </label>

        {project.folders.length > 0 && (
          <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-canvas pl-2.5">
            <FontAwesomeIcon icon={faFolder} className="text-[11px] text-ink-400" />
            <select aria-label="Filtrar por carpeta" value={folderFilter} onChange={(event) => setFolderFilter(event.target.value)} className="h-full bg-transparent pr-2 text-sm text-ink-900 outline-none">
              <option value="all">Todas las carpetas</option>
              <option value="none">Sin carpeta</option>
              {project.folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
            </select>
          </label>
        )}

        {/* La leyenda también filtra: cada tipo de flecha se oculta o se muestra. */}
        <div role="group" aria-label="Tipos de relación" className="flex flex-wrap items-center gap-1.5">
          {KINDS.map((kind) => {
            const visible = !hiddenKinds.has(kind);
            const count = allEdges.filter((edge) => edge.kind === kind).length;
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={visible}
                onClick={() => toggleKind(kind)}
                title={visible ? 'Ocultar este tipo' : 'Mostrar este tipo'}
                className={`flex h-8 items-center gap-2 rounded-full border px-3 text-[11px] font-medium ${visible ? 'border-line bg-surface text-ink-900' : 'border-dashed border-line text-ink-400 line-through'}`}
              >
                <svg width="18" height="6" aria-hidden><line x1="0" y1="3" x2="18" y2="3" style={{ stroke: EDGE_STYLE[kind].color }} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={EDGE_STYLE[kind].dash} /></svg>
                {EDGE_STYLE[kind].name}
                <span className="tabular-nums text-ink-400">{count}</span>
              </button>
            );
          })}
        </div>

        <button type="button" onClick={close} aria-label="Cerrar el mapa" className="ml-auto flex size-9 items-center justify-center rounded-lg text-ink-400 hover:bg-raised hover:text-ink-900">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <MapCanvas
          layout={layout}
          edges={edges}
          problems={problems}
          project={project}
          matches={matches}
          focusId={focusId}
          selectedId={selected?.id ?? null}
          onHover={setHovered}
          onSelect={setSelectedId}
          onOpen={openDiagram}
          onCreate={createInPhase}
        />
        {selected && (
          <DetailPanel
            diagram={selected}
            diagrams={diagrams}
            edges={edges}
            problems={problems.get(selected.id) ?? 0}
            folder={project.folders.find((folder) => folder.id === project.folderOf[selected.id])?.name}
            onSelect={setSelectedId}
            onOpen={openDiagram}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}

interface MapCanvasProps {
  layout: ReturnType<typeof layoutMap>;
  edges: MapEdge[];
  problems: Map<string, number>;
  project: DiagramProject;
  matches: Set<string> | null;
  focusId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
}

/** El lienzo del mapa: se mueve arrastrando el fondo o con la rueda; Ctrl+rueda acerca o aleja. */
function MapCanvas({ layout, edges, problems, project, matches, focusId, selectedId, onHover, onSelect, onOpen, onCreate }: MapCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<Viewport>({ x: 16, y: 16, zoom: 1 });
  const [panning, setPanning] = useState(false);

  const fit = useCallback(() => {
    const box = viewportRef.current?.getBoundingClientRect();
    if (box) setView(fitViewport(layout, box.width, box.height));
  }, [layout]);
  // Al abrir (y si cambia lo que se muestra), se encuadra todo.
  useEffect(fit, [fit]);

  // La rueda se escucha a mano: React la registra como pasiva y no deja evitar el scroll de la página.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = element.getBoundingClientRect();
      if (event.ctrlKey || event.metaKey) {
        const anchor = { x: event.clientX - box.left, y: event.clientY - box.top };
        setView((current) => zoomAround(current, current.zoom * Math.exp(-event.deltaY * 0.0025), anchor));
      } else {
        setView((current) => ({ ...current, x: current.x - event.deltaX, y: current.y - event.deltaY }));
      }
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('[data-map-card], button')) return;
    const origin = { x: event.clientX, y: event.clientY, view };
    let moved = false;
    setPanning(true);
    const move = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - origin.x;
      const dy = moveEvent.clientY - origin.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      setView({ ...origin.view, x: origin.view.x + dx, y: origin.view.y + dy });
    };
    const up = () => {
      setPanning(false);
      // Un clic sin arrastrar sobre el fondo quita la selección.
      if (!moved) onSelect(null);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const zoomBy = (factor: number) => {
    const box = viewportRef.current?.getBoundingClientRect();
    if (box) setView((current) => zoomAround(current, current.zoom * factor, { x: box.width / 2, y: box.height / 2 }));
  };
  const linked = focusId ? new Set(edges.flatMap((edge) => (edge.sourceId === focusId || edge.targetId === focusId ? [edge.sourceId, edge.targetId] : []))) : null;
  const connected = new Set(edges.flatMap((edge) => [edge.sourceId, edge.targetId]));

  return (
    <div
      ref={viewportRef}
      onPointerDown={startPan}
      className={`trazo-map relative min-w-0 flex-1 overflow-hidden ${panning ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ backgroundImage: 'radial-gradient(var(--color-line) 1px, transparent 1px)', backgroundSize: `${22 * view.zoom}px ${22 * view.zoom}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
    >
      <div className="absolute top-0 left-0 origin-top-left" style={{ width: layout.width, height: layout.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
        {MAP_PHASES.map((phase, column) => {
          const count = layout.phases.get(phase.id)!.length;
          return (
            <div key={phase.id} className={`absolute top-0 bottom-0 rounded-2xl ${column % 2 === 0 ? 'bg-surface/40' : ''}`} style={{ left: columnLeft(column) + 6, width: COLUMN_WIDTH - 12 }}>
              <div className="px-4 pt-5">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-900">
                  <span className="flex size-5 items-center justify-center rounded-full bg-raised text-[10px] tabular-nums text-ink-600">{column + 1}</span>
                  {phase.name}
                  <span className={`ml-auto rounded-full px-2 py-px text-[10px] font-semibold ${count > 0 ? 'bg-accent-soft text-accent' : 'bg-raised text-ink-400'}`}>{count}</span>
                </p>
                <p className="mt-1 text-[11px] leading-snug text-ink-400">{phase.question}</p>
              </div>
              {count === 0 && (
                <button type="button" onClick={onCreate} className="absolute inset-x-5 flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-line px-3 py-6 text-[11px] text-ink-400 hover:border-accent/50 hover:text-accent" style={{ top: 150 }}>
                  <FontAwesomeIcon icon={faPlus} />
                  Crear un diagrama de {phase.name.toLowerCase()}
                </button>
              )}
            </div>
          );
        })}

        <svg className="pointer-events-none absolute inset-0 overflow-visible" width={layout.width} height={layout.height} aria-hidden>
          <defs>
            {KINDS.map((kind) => (
              <marker key={kind} id={`map-arrow-${kind}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" style={{ fill: EDGE_STYLE[kind].color }} />
              </marker>
            ))}
          </defs>
          {edges.map((edge, index) => {
            const from = layout.cards.get(edge.sourceId);
            const to = layout.cards.get(edge.targetId);
            if (!from || !to) return null;
            const involved = focusId !== null && (edge.sourceId === focusId || edge.targetId === focusId);
            return <MapArrow key={index} edge={edge} from={from} to={to} lane={laneOf(edges, edge)} state={focusId === null ? 'normal' : involved ? 'active' : 'dimmed'} />;
          })}
        </svg>

        {[...layout.cards.values()].map((card) => (
          <MapCard
            key={card.diagram.id}
            card={card}
            problems={problems.get(card.diagram.id) ?? 0}
            folder={project.folders.find((folder) => folder.id === project.folderOf[card.diagram.id])?.name}
            isolated={!connected.has(card.diagram.id)}
            selected={selectedId === card.diagram.id}
            dimmed={(matches !== null && !matches.has(card.diagram.id)) || (linked !== null && !linked.has(card.diagram.id))}
            onHover={onHover}
            onSelect={onSelect}
            onOpen={onOpen}
          />
        ))}
      </div>

      <div className="absolute bottom-4 left-4 flex items-center gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-panel">
        <button type="button" onClick={() => zoomBy(1 / ZOOM_STEP)} aria-label="Alejar" className="flex size-8 items-center justify-center rounded-lg text-ink-600 hover:bg-raised hover:text-ink-900"><FontAwesomeIcon icon={faMinus} className="text-xs" /></button>
        <span className="w-12 text-center text-[11px] tabular-nums text-ink-600">{Math.round(view.zoom * 100)} %</span>
        <button type="button" onClick={() => zoomBy(ZOOM_STEP)} aria-label="Acercar" className="flex size-8 items-center justify-center rounded-lg text-ink-600 hover:bg-raised hover:text-ink-900"><FontAwesomeIcon icon={faPlus} className="text-xs" /></button>
        <button type="button" onClick={fit} title="Ver todo el mapa" className="ml-0.5 flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium text-ink-600 hover:bg-raised hover:text-ink-900"><FontAwesomeIcon icon={faCompress} className="text-[11px]" /> Ajustar</button>
      </div>
      <p className="pointer-events-none absolute right-4 bottom-4 hidden rounded-lg bg-surface/80 px-2.5 py-1.5 text-[11px] text-ink-400 md:block">
        Arrastra para moverte · Ctrl + rueda para el zoom · Doble clic abre el diagrama
      </p>
    </div>
  );
}

interface MapCardProps {
  card: PlacedCard;
  problems: number;
  folder: string | undefined;
  isolated: boolean;
  selected: boolean;
  dimmed: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}

/** Tarjeta de un diagrama: tipo, nombre, elementos, estado y carpeta. Clic elige; doble clic abre. */
function MapCard({ card, problems, folder, isolated, selected, dimmed, onHover, onSelect, onOpen }: MapCardProps) {
  const { diagram } = card;
  const module = diagramRegistry.has(diagram.diagramType) ? diagramRegistry.get(diagram.diagramType) : undefined;
  return (
    <button
      type="button"
      data-map-card
      onClick={() => onSelect(diagram.id)}
      onDoubleClick={() => onOpen(diagram.id)}
      onMouseEnter={() => onHover(diagram.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(diagram.id)}
      onBlur={() => onHover(null)}
      aria-pressed={selected}
      className={`trazo-map-card absolute flex flex-col overflow-hidden rounded-xl border bg-surface text-left shadow-sm transition-[opacity,box-shadow,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
        selected ? 'border-accent shadow-panel ring-2 ring-accent/25' : 'border-line hover:border-accent/50 hover:shadow-panel'
      } ${dimmed ? 'opacity-30' : ''}`}
      style={{ left: card.x, top: card.y, width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      <span className="h-1 shrink-0 bg-accent/60" />
      <span className="flex min-h-0 flex-1 flex-col px-3.5 pt-2.5 pb-2.5">
        <span className="truncate text-[11px] text-ink-400">{module?.displayName ?? diagram.diagramType}</span>
        <span className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-ink-900">{diagram.name || 'Sin título'}</span>
        <span className="mt-auto flex items-center gap-2 text-[11px]">
          {problems > 0 ? (
            <span className="flex items-center gap-1 font-medium text-warning"><FontAwesomeIcon icon={faCircleExclamation} className="text-[10px]" />{problems}</span>
          ) : (
            <span className="flex items-center gap-1 text-success"><FontAwesomeIcon icon={faCircleCheck} className="text-[10px]" />En orden</span>
          )}
          <span className="text-ink-400">{diagram.nodes.length} elem.</span>
          {isolated && <span className="rounded-full bg-raised px-1.5 py-px text-ink-400" title="No se relaciona con ningún otro diagrama">Aislado</span>}
          {folder && <span className="ml-auto max-w-20 truncate text-ink-400" title={`Carpeta «${folder}»`}>{folder}</span>}
        </span>
      </span>
    </button>
  );
}

/** Flecha entre dos tarjetas, con su texto en una píldora. Resaltada, su trazo fluye. */
function MapArrow({ edge, from, to, lane, state }: { edge: MapEdge; from: PlacedCard; to: PlacedCard; lane: number; state: 'normal' | 'active' | 'dimmed' }) {
  const style = EDGE_STYLE[edge.kind];
  const { d, label } = arrowBetween(from, to, lane);
  const text = `${edge.label}${edge.count > 1 ? ` ×${edge.count}` : ''}`;
  const pillWidth = text.length * 6.2 + 16;
  return (
    <g opacity={state === 'dimmed' ? 0.12 : 1} style={{ transition: 'opacity 160ms ease' }}>
      <path
        d={d}
        fill="none"
        style={{ stroke: style.color }}
        strokeWidth={state === 'active' ? 2.4 : 1.6}
        strokeDasharray={state === 'active' ? '7 5' : style.dash}
        className={state === 'active' ? 'trazo-map-flow' : undefined}
        markerEnd={`url(#map-arrow-${edge.kind})`}
      />
      <rect x={label.x - pillWidth / 2} y={label.y - 10} width={pillWidth} height={20} rx={10} style={{ fill: 'var(--color-surface)', stroke: style.color }} strokeWidth={1} />
      <text x={label.x} y={label.y + 3.5} textAnchor="middle" fontSize="10.5" fontWeight={600} style={{ fill: style.color }}>{text}</text>
    </g>
  );
}

interface DetailPanelProps {
  diagram: Diagram;
  diagrams: Diagram[];
  edges: MapEdge[];
  problems: number;
  folder: string | undefined;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onClose: () => void;
}

/** Panel del diagrama elegido: su ficha y sus relaciones (salientes y entrantes), navegables. */
function DetailPanel({ diagram, diagrams, edges, problems, folder, onSelect, onOpen, onClose }: DetailPanelProps) {
  const nameOf = (id: string) => diagrams.find((item) => item.id === id)?.name ?? 'Diagrama';
  const outgoing = edges.filter((edge) => edge.sourceId === diagram.id);
  const incoming = edges.filter((edge) => edge.targetId === diagram.id);
  const phase = MAP_PHASES.find((item) => item.id === PHASE_OF[diagram.diagramType]);
  const module = diagramRegistry.has(diagram.diagramType) ? diagramRegistry.get(diagram.diagramType) : undefined;

  const list = (title: string, items: MapEdge[], otherOf: (edge: MapEdge) => string, verb: (edge: MapEdge) => string) => (
    <section className="mt-5">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{title} <span className="tabular-nums">· {items.length}</span></h4>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-ink-400">Ninguna.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((edge, index) => (
            <li key={index}>
              <button type="button" onClick={() => onSelect(otherOf(edge))} className="flex w-full items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-left hover:border-accent/50">
                <span className="size-2 shrink-0 rounded-full" style={{ background: EDGE_STYLE[edge.kind].color }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-ink-400">{verb(edge)}</span>
                  <span className="block truncate text-sm text-ink-900">{nameOf(otherOf(edge))}</span>
                </span>
                <FontAwesomeIcon icon={faArrowRight} className="text-[10px] text-ink-400" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
  const describe = (edge: MapEdge) => `${edge.kind === 'subprocess' ? 'subproceso' : edge.label}${edge.count > 1 ? ` ×${edge.count}` : ''}`;

  return (
    <aside className="motion-panel flex w-80 shrink-0 flex-col border-l border-line bg-surface max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-10 max-md:shadow-panel" aria-label={`Detalle de «${diagram.name}»`}>
      <header className="flex items-start gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-ink-400">{module?.displayName ?? diagram.diagramType}</p>
          <h3 className="mt-0.5 text-base font-semibold leading-snug text-ink-900">{diagram.name || 'Sin título'}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar el detalle" className="flex size-8 items-center justify-center rounded-lg text-ink-400 hover:bg-raised hover:text-ink-900"><FontAwesomeIcon icon={faXmark} /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-canvas px-3 py-2"><dt className="text-ink-400">Fase</dt><dd className="mt-0.5 font-medium text-ink-900">{phase?.name}</dd></div>
          <div className="rounded-lg bg-canvas px-3 py-2"><dt className="text-ink-400">Carpeta</dt><dd className="mt-0.5 truncate font-medium text-ink-900">{folder ?? 'Sin carpeta'}</dd></div>
          <div className="rounded-lg bg-canvas px-3 py-2"><dt className="text-ink-400">Elementos</dt><dd className="mt-0.5 font-medium tabular-nums text-ink-900">{diagram.nodes.length + diagram.edges.length}</dd></div>
          <div className="rounded-lg bg-canvas px-3 py-2"><dt className="text-ink-400">Problemas</dt><dd className={`mt-0.5 font-medium tabular-nums ${problems > 0 ? 'text-warning' : 'text-success'}`}>{problems > 0 ? problems : 'Ninguno'}</dd></div>
        </dl>
        <button type="button" onClick={() => onOpen(diagram.id)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90">
          <FontAwesomeIcon icon={faUpRightFromSquare} className="text-xs" /> Abrir diagrama
        </button>
        {list('Sale hacia', outgoing, (edge) => edge.targetId, (edge) => `Este diagrama: ${describe(edge)}`)}
        {list('Llega desde', incoming, (edge) => edge.sourceId, (edge) => `${describe(edge)} a este`)}
        {outgoing.length + incoming.length === 0 && (
          <p className="mt-4 rounded-lg bg-canvas px-3 py-2.5 text-xs leading-relaxed text-ink-600">
            Está aislado. Relaciónalo desde la pestaña Vínculos del inspector, o enlaza un subproceso ⋔ hacia él.
          </p>
        )}
      </div>
    </aside>
  );
}

/** Problemas por diagrama (errores y advertencias de sus reglas, más los del proyecto que lo tocan). */
function problemCounts(diagrams: Diagram[], project: Pick<DiagramProject, 'traceLinks'>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const diagram of diagrams) {
    if (!diagramRegistry.has(diagram.diagramType)) continue;
    const issues = validateDiagram(diagram, diagramRegistry.get(diagram.diagramType).rules).filter((issue) => issue.severity !== 'info');
    counts.set(diagram.id, issues.length);
  }
  for (const issue of validateProject({ diagrams, traceLinks: project.traceLinks }, projectRules)) {
    if (issue.severity === 'info') continue;
    for (const id of new Set(issue.elements.map((element) => element.diagramId))) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
