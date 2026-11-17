import {
  faBullseye,
  faCircleCheck,
  faCircleExclamation,
  faLink,
  faListUl,
  faMagnifyingGlass,
  faPlus,
  faTableCells,
  faTrashCan,
  faUpRightFromSquare,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  coverageSummary,
  impactOf,
  REQUIREMENT_KINDS,
  REQUIREMENT_PRIORITIES,
  REQUIREMENT_STATUSES,
  requirementCoverage,
  requirementMatrix,
  type Diagram,
  type DiagramProject,
  type RequirementCoverage,
  type RequirementKind,
} from '@/core/model';
import { useProjectStore } from '@/core/store/projectStore';
import { normalizeName } from '@/diagrams/crossDiagram/names';
import { useDialogBehavior } from '@/ui/dialogs/useDialogBehavior';
import { inputClass } from '@/ui/explanation/formFields';
import { useProjectDiagrams } from '@/ui/projects/useProjectDiagrams';
import { elementOptions, openTarget, targetLabel } from '@/ui/traceability/elementLabels';
import { useUiStore } from '@/ui/uiStore';

const projects = () => useProjectStore.getState();
const ui = () => useUiStore.getState();

/** Color de la etiqueta de cada tipo de requisito. */
const KIND_STYLE: Record<RequirementKind, string> = {
  funcional: 'bg-accent-soft text-accent',
  'no funcional': 'bg-info/15 text-info',
  'regla de negocio': 'bg-warning-soft text-warning',
};

type View = 'list' | 'matrix';
type Filter = 'all' | 'uncovered' | RequirementKind;

/**
 * Requisitos del proyecto: qué se pidió y qué parte del modelo lo cumple. La
 * lista edita cada requisito y sus vínculos; la matriz (requisitos × diagramas)
 * muestra de un vistazo lo cubierto y lo pendiente. Desde un requisito se ve su
 * impacto en el mapa del proyecto.
 */
export function RequirementsScreen() {
  const open = useUiStore((state) => state.requirementsOpen);
  const project = useProjectStore((state) => state.project);
  if (!open || !project) return null;
  return <Screen project={project} />;
}

function Screen({ project }: { project: DiagramProject }) {
  const diagrams = useProjectDiagrams();
  const focusId = useUiStore((state) => state.requirementsFocusId);
  const close = useCallback(() => ui().setRequirementsOpen(false), []);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(true, dialogRef, close);
  const [view, setView] = useState<View>('list');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(focusId ?? project.requirements[0]?.id ?? null);

  const coverage = useMemo(() => requirementCoverage(project.requirements, project.requirementLinks, diagrams), [project.requirements, project.requirementLinks, diagrams]);
  const summary = coverageSummary(coverage);
  const visible = coverage.filter((item) => {
    if (filter === 'uncovered' && (item.covered || item.requirement.status === 'descartado')) return false;
    if (filter !== 'all' && filter !== 'uncovered' && item.requirement.kind !== filter) return false;
    const wanted = normalizeName(query);
    return !wanted || normalizeName(`${item.requirement.code} ${item.requirement.title}`).includes(wanted);
  });
  const selected = coverage.find((item) => item.requirement.id === selectedId);

  function create(kind: RequirementKind) {
    const id = projects().addRequirement(kind);
    if (id) {
      setSelectedId(id);
      setView('list');
      setFilter('all');
    }
  }
  function showImpact(item: RequirementCoverage) {
    const impact = impactOf(
      { diagrams, requirementLinks: project.requirementLinks, traceLinks: project.traceLinks, diagramRelations: project.diagramRelations },
      { requirementId: item.requirement.id },
    );
    ui().setMapFocus({ label: `Impacto de ${item.requirement.code}`, diagramIds: [...impact.diagramIds] });
    close();
    ui().setProjectMapOpen(true);
  }

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="requirements-title" tabIndex={-1} className="fixed inset-0 z-50 flex flex-col bg-canvas outline-none">
      <header className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-surface px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><FontAwesomeIcon icon={faBullseye} /></span>
          <div className="min-w-0">
            <h2 id="requirements-title" className="truncate text-sm font-semibold text-ink-900">Requisitos de «{project.name}»</h2>
            <p className="text-[11px] text-ink-400">Qué se pidió y qué parte del modelo lo cumple</p>
          </div>
        </div>

        <div className="flex min-w-48 items-center gap-3" title="Requisitos cubiertos (sin contar los descartados)">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-raised">
            <div className={`h-full rounded-full ${summary.percent === 100 ? 'bg-success' : 'bg-accent'}`} style={{ width: `${summary.percent}%` }} />
          </div>
          <span className="text-xs text-ink-600"><span className="font-semibold tabular-nums text-ink-900">{summary.covered}/{summary.total}</span> cubiertos · {summary.percent} %</span>
        </div>

        <div role="tablist" aria-label="Vista" className="flex rounded-lg bg-canvas p-0.5">
          {([['list', 'Lista', faListUl], ['matrix', 'Matriz', faTableCells]] as const).map(([id, label, icon]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium ${view === id ? 'bg-surface text-accent shadow-sm' : 'text-ink-600 hover:text-ink-900'}`}>
              <FontAwesomeIcon icon={icon} className="text-[11px]" /> {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {REQUIREMENT_KINDS.map((kind) => (
            <button key={kind.id} type="button" onClick={() => create(kind.id)} title={`Nuevo requisito ${kind.name.toLowerCase()} (${kind.prefix})`} className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-medium text-ink-900 hover:border-accent/50 hover:text-accent">
              <FontAwesomeIcon icon={faPlus} className="text-[10px]" /> {kind.prefix}
            </button>
          ))}
        </div>

        <button type="button" onClick={close} aria-label="Cerrar requisitos" className="ml-auto flex size-9 items-center justify-center rounded-lg text-ink-400 hover:bg-raised hover:text-ink-900">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </header>

      {project.requirements.length === 0 ? (
        <EmptyState onCreate={create} />
      ) : view === 'matrix' ? (
        <Matrix coverage={coverage} diagrams={diagrams} onSelect={(id) => { setSelectedId(id); setView('list'); }} onOpen={(diagramId, elementId) => { close(); openTarget(diagrams, diagramId, elementId); }} />
      ) : (
        <div className="flex min-h-0 flex-1 max-md:flex-col">
          <aside className="flex w-96 shrink-0 flex-col border-r border-line bg-surface max-md:max-h-[45%] max-md:w-full max-md:border-r-0 max-md:border-b">
            <div className="space-y-2 p-3">
              <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-canvas px-2.5 focus-within:border-accent">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[11px] text-ink-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por código o título" aria-label="Buscar requisito" className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none" />
              </label>
              <div role="group" aria-label="Filtrar" className="flex flex-wrap gap-1">
                {([['all', 'Todos'], ['uncovered', 'Sin cubrir'], ...REQUIREMENT_KINDS.map((kind) => [kind.id, kind.name])] as [Filter, string][]).map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${filter === id ? 'bg-brand text-white' : 'bg-raised text-ink-600 hover:text-ink-900'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
              {visible.length === 0 && <li className="px-2 py-3 text-xs text-ink-400">Ningún requisito coincide.</li>}
              {visible.map((item) => (
                <li key={item.requirement.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.requirement.id)}
                    aria-current={selectedId === item.requirement.id ? 'true' : undefined}
                    className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left ${selectedId === item.requirement.id ? 'bg-accent-soft/60 ring-1 ring-accent/40' : 'hover:bg-raised'} ${item.requirement.status === 'descartado' ? 'opacity-50' : ''}`}
                  >
                    <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${KIND_STYLE[item.requirement.kind]}`}>{item.requirement.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug text-ink-900">{item.requirement.title}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-400">{item.requirement.status} · prioridad {item.requirement.priority} · {item.links.length} {item.links.length === 1 ? 'vínculo' : 'vínculos'}</span>
                    </span>
                    <CoverageIcon item={item} />
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          {selected ? (
            <Editor key={selected.requirement.id} item={selected} diagrams={diagrams} onImpact={() => showImpact(selected)} onOpen={(diagramId, elementId) => { close(); openTarget(diagrams, diagramId, elementId); }} />
          ) : (
            <p className="flex flex-1 items-center justify-center p-8 text-sm text-ink-400">Elige un requisito para ver qué lo cumple.</p>
          )}
        </div>
      )}
    </div>
  );
}

function CoverageIcon({ item }: { item: RequirementCoverage }) {
  if (item.requirement.status === 'descartado') return <span className="mt-1 text-[10px] text-ink-400">descartado</span>;
  if (item.broken.length > 0) return <FontAwesomeIcon icon={faCircleExclamation} className="mt-1 text-xs text-danger" title="Tiene vínculos rotos" />;
  return item.covered
    ? <FontAwesomeIcon icon={faCircleCheck} className="mt-1 text-xs text-success" title="Cubierto" />
    : <FontAwesomeIcon icon={faCircleExclamation} className="mt-1 text-xs text-warning" title="Sin cubrir" />;
}

function EmptyState({ onCreate }: { onCreate: (kind: RequirementKind) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-lg text-accent"><FontAwesomeIcon icon={faBullseye} /></span>
      <div className="max-w-md">
        <p className="text-base font-semibold text-ink-900">Todavía no hay requisitos</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-600">Anota lo que el sistema debe hacer (RF), cómo debe hacerlo (RNF) y las reglas del negocio (RN). Después vincula cada uno con el diagrama o el elemento que lo cumple: así sabrás qué falta y qué afecta cada cambio.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {REQUIREMENT_KINDS.map((kind) => (
          <button key={kind.id} type="button" onClick={() => onCreate(kind.id)} className="flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white hover:opacity-90">
            <FontAwesomeIcon icon={faPlus} className="text-xs" /> {kind.name} ({kind.prefix})
          </button>
        ))}
      </div>
    </div>
  );
}

/** Editor de un requisito: datos, lo que lo cumple (navegable), vincular, impacto y borrar. */
function Editor({ item, diagrams, onImpact, onOpen }: { item: RequirementCoverage; diagrams: Diagram[]; onImpact: () => void; onOpen: (diagramId: string, elementId: string | null) => void }) {
  const { requirement } = item;
  const update = (patch: Parameters<ReturnType<typeof useProjectStore.getState>['updateRequirement']>[1]) => projects().updateRequirement(requirement.id, patch);
  const [diagramId, setDiagramId] = useState(diagrams[0]?.id ?? '');
  const [elementKey, setElementKey] = useState('');
  const [confirming, setConfirming] = useState(false);
  const target = diagrams.find((diagram) => diagram.id === diagramId);
  // Se elige la lista y se filtra aparte: un selector que devuelve un arreglo nuevo en cada render haría renders en bucle.
  const allLinks = useProjectStore((state) => state.project?.requirementLinks);
  const links = useMemo(() => (allLinks ?? []).filter((link) => link.requirementId === requirement.id), [allLinks, requirement.id]);

  return (
    <section className="min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-6 lg:px-8" aria-label={`Requisito ${requirement.code}`}>
      <div className="flex flex-wrap items-start gap-3">
        <input aria-label="Código" defaultValue={requirement.code} onBlur={(event) => update({ code: event.target.value })} className={`w-24 rounded-lg px-2 py-1.5 text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-accent/30 ${KIND_STYLE[requirement.kind]}`} />
        <input aria-label="Título" defaultValue={requirement.title} onBlur={(event) => update({ title: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()} className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xl font-semibold text-ink-900 outline-none hover:border-line focus:border-accent" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Select label="Tipo" value={requirement.kind} options={REQUIREMENT_KINDS.map((kind) => [kind.id, kind.name])} onChange={(kind) => update({ kind: kind as RequirementKind })} />
        <Select label="Prioridad" value={requirement.priority} options={REQUIREMENT_PRIORITIES.map((priority) => [priority, priority])} onChange={(priority) => update({ priority: priority as typeof requirement.priority })} />
        <Select label="Estado" value={requirement.status} options={REQUIREMENT_STATUSES.map((status) => [status, status])} onChange={(status) => update({ status: status as typeof requirement.status })} />
      </div>
      <label className="mt-4 block">
        <span className="mb-1 block text-[11px] font-medium text-ink-400">Descripción y criterio de aceptación</span>
        <textarea defaultValue={requirement.description} onBlur={(event) => update({ description: event.target.value })} rows={3} placeholder="Qué debe pasar para darlo por cumplido" className={`${inputClass} resize-y`} />
      </label>

      <section className="mt-6">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-ink-900">Lo cumple</h3>
          <CoverageIcon item={item} />
          <button type="button" onClick={onImpact} disabled={links.length === 0} className="ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent-soft disabled:opacity-40" title="Muestra en el mapa todo lo que se vería afectado si este requisito cambia">
            <FontAwesomeIcon icon={faBullseye} className="text-[10px]" /> Ver impacto en el mapa
          </button>
        </div>
        {links.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-line px-3 py-3 text-xs text-ink-600">Nada todavía. Vincúlalo abajo con el diagrama o el elemento que lo resuelve.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {links.map((link) => {
              const broken = item.broken.some((candidate) => candidate.id === link.id);
              return (
                <li key={link.id} className={`group flex items-center gap-2 rounded-lg border px-3 py-2 ${broken ? 'border-danger/40 bg-danger-soft/40' : 'border-line'}`}>
                  <FontAwesomeIcon icon={faLink} className={`text-[10px] ${broken ? 'text-danger' : 'text-ink-400'}`} />
                  <button type="button" disabled={broken} onClick={() => onOpen(link.diagramId, link.elementId)} className="min-w-0 flex-1 truncate text-left text-sm text-ink-900 enabled:hover:text-accent">
                    {targetLabel(diagrams, link.diagramId, link.elementId)}
                    {link.elementId === null && <span className="ml-1.5 text-[11px] text-ink-400">(todo el diagrama)</span>}
                  </button>
                  {!broken && (
                    <button type="button" onClick={() => onOpen(link.diagramId, link.elementId)} aria-label="Abrir" className="flex size-7 items-center justify-center rounded-md text-ink-400 opacity-0 hover:bg-raised hover:text-accent focus-visible:opacity-100 group-hover:opacity-100">
                      <FontAwesomeIcon icon={faUpRightFromSquare} className="text-[10px]" />
                    </button>
                  )}
                  <button type="button" onClick={() => projects().unlinkRequirement(link.id)} aria-label="Quitar el vínculo" className="flex size-7 items-center justify-center rounded-md text-ink-400 hover:bg-danger-soft hover:text-danger">
                    <FontAwesomeIcon icon={faXmark} className="text-[11px]" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {diagrams.length > 0 && (
          <div className="mt-3 grid gap-2 rounded-xl bg-canvas p-3 sm:grid-cols-[1fr_1fr_auto]">
            <select aria-label="Diagrama" value={diagramId} onChange={(event) => { setDiagramId(event.target.value); setElementKey(''); }} className={inputClass}>
              {diagrams.map((diagram) => <option key={diagram.id} value={diagram.id}>{diagram.name}</option>)}
            </select>
            <select aria-label="Elemento" value={elementKey} onChange={(event) => setElementKey(event.target.value)} className={inputClass}>
              <option value="">Todo el diagrama</option>
              {target && elementOptions(target).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <button type="button" onClick={() => { if (diagramId) projects().linkRequirement(requirement.id, diagramId, elementKey || null); setElementKey(''); }} className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90">
              <FontAwesomeIcon icon={faPlus} className="text-xs" /> Vincular
            </button>
          </div>
        )}
      </section>

      <div className="mt-8 border-t border-line pt-4">
        {confirming ? (
          <div role="alertdialog" aria-label={`Eliminar ${requirement.code}`} className="flex flex-wrap items-center gap-2 rounded-lg bg-danger-soft px-3 py-2">
            <span className="text-xs text-ink-900">¿Eliminar {requirement.code} y sus {links.length} vínculos? Considera marcarlo «descartado» para conservar el historial.</span>
            <button type="button" autoFocus onClick={() => projects().deleteRequirement(requirement.id)} className="rounded-md bg-danger px-2.5 py-1 text-xs font-medium text-white">Eliminar</button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-md px-2.5 py-1 text-xs text-ink-600 hover:bg-raised">Cancelar</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="flex items-center gap-1.5 text-xs text-danger hover:underline">
            <FontAwesomeIcon icon={faTrashCan} className="text-[10px]" /> Eliminar requisito…
          </button>
        )}
      </div>
    </section>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-ink-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} capitalize`}>
        {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
    </label>
  );
}

/**
 * Matriz requisitos × diagramas. Cada celda dice cuántos elementos de ese
 * diagrama cumplen el requisito: con vínculos, abre el diagrama; vacía, un clic
 * vincula el diagrama completo. La última columna resume la cobertura.
 */
function Matrix({ coverage, diagrams, onSelect, onOpen }: { coverage: RequirementCoverage[]; diagrams: Diagram[]; onSelect: (id: string) => void; onOpen: (diagramId: string, elementId: string | null) => void }) {
  const matrix = requirementMatrix(coverage);
  const columnTotals = diagrams.map((diagram) => coverage.filter((item) => (matrix.get(item.requirement.id)?.get(diagram.id) ?? 0) > 0).length);
  return (
    <div className="min-h-0 flex-1 overflow-auto p-4">
      <table className="border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky top-0 left-0 z-20 min-w-72 border-b border-line bg-canvas px-3 py-2 text-left text-[11px] font-semibold text-ink-400">Requisito</th>
            {diagrams.map((diagram, index) => (
              <th key={diagram.id} className="sticky top-0 z-10 w-28 min-w-28 border-b border-line bg-canvas px-2 py-2 text-left align-bottom">
                <span className="line-clamp-2 text-[11px] font-semibold leading-snug text-ink-900" title={diagram.name}>{diagram.name}</span>
                <span className="text-[10px] text-ink-400">{columnTotals[index]} req.</span>
              </th>
            ))}
            <th className="sticky top-0 z-10 border-b border-line bg-canvas px-3 py-2 text-left text-[11px] font-semibold text-ink-400">Estado</th>
          </tr>
        </thead>
        <tbody>
          {coverage.map((item) => {
            const row = matrix.get(item.requirement.id)!;
            const counting = item.requirement.status !== 'descartado';
            return (
              <tr key={item.requirement.id} className={`group ${counting && !item.covered ? 'bg-warning-soft/30' : ''} ${counting ? '' : 'opacity-50'}`}>
                <td className="sticky left-0 z-10 border-b border-line bg-surface px-3 py-2 group-hover:bg-raised">
                  <button type="button" onClick={() => onSelect(item.requirement.id)} className="flex items-start gap-2 text-left">
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${KIND_STYLE[item.requirement.kind]}`}>{item.requirement.code}</span>
                    <span className="line-clamp-2 text-[13px] leading-snug text-ink-900 hover:text-accent">{item.requirement.title}</span>
                  </button>
                </td>
                {diagrams.map((diagram) => {
                  const count = row.get(diagram.id) ?? 0;
                  return (
                    <td key={diagram.id} className="border-b border-line px-2 py-2 text-center">
                      {count > 0 ? (
                        <button type="button" onClick={() => onOpen(diagram.id, item.links.find((link) => link.diagramId === diagram.id)?.elementId ?? null)} title={`Abrir «${diagram.name}»`} className="inline-flex size-7 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white hover:opacity-90">
                          {count}
                        </button>
                      ) : (
                        <button type="button" onClick={() => projects().linkRequirement(item.requirement.id, diagram.id, null)} title={`Vincular «${diagram.name}» completo con ${item.requirement.code}`} aria-label={`Vincular ${item.requirement.code} con «${diagram.name}»`} className="inline-flex size-7 items-center justify-center rounded-full text-[11px] text-transparent hover:bg-accent-soft hover:text-accent focus-visible:text-accent">
                          <FontAwesomeIcon icon={faPlus} />
                        </button>
                      )}
                    </td>
                  );
                })}
                <td className="border-b border-line px-3 py-2 text-xs whitespace-nowrap">
                  {!counting ? <span className="text-ink-400">descartado</span> : item.covered ? <span className="text-success">Cubierto</span> : <span className="font-medium text-warning">Sin cubrir</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-ink-400">Un número: cuántos elementos de ese diagrama lo cumplen (clic para abrirlo). Celda vacía: clic para vincular el diagrama completo.</p>
    </div>
  );
}
