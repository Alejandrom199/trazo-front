import { faCheck, faCircleCheck, faCopy, faFileLines, faLightbulb, faPlus, faTriangleExclamation, faUser, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nodeName, type Diagram, type DiagramNode } from '@/core/model';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';
import { UseCaseArtifact as U } from '@/diagrams/usecase/artifactTypes';
import {
  emptySpec,
  nextUseCaseCode,
  readSpec,
  reviewSpec,
  USE_CASE_IMPORTANCE,
  USE_CASE_LEVEL,
  useCaseContext,
  withSpec,
  type AlternateFlow,
  type UseCaseContext,
  type UseCaseSpec,
  type UseCaseStep,
} from '@/diagrams/usecase/spec';
import { useDialogBehavior } from '@/ui/dialogs/useDialogBehavior';
import { inputClass } from '@/ui/explanation/formFields';
import { useProjectDiagrams } from '@/ui/projects/useProjectDiagrams';
import { ListEditor, Row } from '@/ui/requirements/RequirementSheet';
import { copyTable, escapeHtml } from '@/ui/clipboard';
import { USE_CASE_SHEET_TIPS } from '@/diagrams/usecase/specGuide';
import { LessonLink } from '@/ui/learn/LessonLink';
import { useUiStore } from '@/ui/uiStore';

const ui = () => useUiStore.getState();
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
/**
 * Ficha de los casos de uso del diagrama abierto: a la izquierda el listado
 * del módulo (código, nombre, actor); a la derecha la ficha del elegido,
 * editable o como tabla de documento, con su revisión.
 */
export function UseCaseSheetDialog() {
  const nodeId = useUiStore((state) => state.useCaseSheetNodeId);
  const diagram = useDiagramStore((state) => state.diagram);
  if (!nodeId || !diagram) return null;
  return <SheetDialog diagram={diagram} initialId={nodeId} />;
}

function SheetDialog({ diagram, initialId }: { diagram: Diagram; initialId: string }) {
  const close = useCallback(() => ui().setUseCaseSheetNodeId(null), []);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(true, dialogRef, close);
  const projectDiagrams = useProjectDiagrams();
  const [selectedId, setSelectedId] = useState(initialId);
  const useCases = diagram.nodes.filter((node) => node.artifactType === U.useCase);
  const selected = useCases.find((node) => node.id === selectedId);

  // Un caso sin ficha recibe la suya al abrirlo, con el siguiente código del proyecto.
  useEffect(() => {
    if (!selected || readSpec(selected)) return;
    const others = projectDiagrams.some((item) => item.id === diagram.id) ? projectDiagrams : [diagram];
    useDiagramStore.getState().updateNode(selected.id, { props: withSpec(selected.props, emptySpec(nextUseCaseCode(others))) });
  }, [selected, projectDiagrams, diagram]);

  const [copied, setCopied] = useState(false);
  async function copyList() {
    const rows = useCases.map((node) => [readSpec(node)?.code ?? '—', nodeName(node), useCaseContext(diagram, node.id).actors.join(', ') || '—']);
    const html = `<table border="1" cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:11pt"><tr><th>Código</th><th>Nombre del Caso de Uso</th><th>Actor</th></tr>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</table>`;
    if (await copyTable(html, rows.map((row) => row.join('\t')).join('\n'))) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="usecase-sheet-title" tabIndex={-1} className="fixed inset-0 z-50 flex flex-col bg-canvas outline-none">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><FontAwesomeIcon icon={faFileLines} /></span>
        <div className="min-w-0">
          <h2 id="usecase-sheet-title" className="truncate text-sm font-semibold text-ink-900">Fichas de casos de uso · {diagram.name}</h2>
          <p className="text-[11px] text-ink-400">Cómo ocurre cada caso, paso a paso, y qué requisito cumple</p>
        </div>
        <button type="button" onClick={close} aria-label="Cerrar las fichas" className="ml-auto flex size-9 items-center justify-center rounded-lg text-ink-400 hover:bg-raised hover:text-ink-900">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 max-md:flex-col">
        <aside className="flex w-80 shrink-0 flex-col border-r border-line bg-surface max-md:max-h-[40%] max-md:w-full max-md:border-r-0 max-md:border-b">
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <h3 className="text-xs font-semibold text-ink-900">Listado de casos de uso</h3>
            <button type="button" onClick={() => void copyList()} title="Copia el listado como tabla (Código, Nombre, Actor)" className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent-soft">
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-[10px]" /> {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
            {useCases.map((node) => {
              const spec = readSpec(node);
              const actors = useCaseContext(diagram, node.id).actors;
              return (
                <li key={node.id}>
                  <button type="button" onClick={() => setSelectedId(node.id)} aria-current={node.id === selectedId ? 'true' : undefined} className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left ${node.id === selectedId ? 'bg-accent-soft/60 ring-1 ring-accent/40' : 'hover:bg-raised'}`}>
                    <span className="mt-0.5 shrink-0 rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-accent">{spec?.code ?? '—'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug text-ink-900">{nodeName(node)}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-400"><FontAwesomeIcon icon={faUser} className="text-[9px]" />{actors.join(', ') || 'sin actor'}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
        {selected && readSpec(selected) ? (
          <SheetEditor key={selected.id} diagram={diagram} node={selected} spec={readSpec(selected)!} />
        ) : (
          <p className="flex flex-1 items-center justify-center p-8 text-sm text-ink-400">{useCases.length === 0 ? 'Este diagrama no tiene casos de uso.' : 'Elige un caso de uso.'}</p>
        )}
      </div>
    </div>
  );
}

/** La ficha del caso elegido: editar o verla como documento, con su revisión al costado. */
function SheetEditor({ diagram, node, spec }: { diagram: Diagram; node: DiagramNode; spec: UseCaseSpec }) {
  const [view, setView] = useState<'edit' | 'table'>('edit');
  const context = useCaseContext(diagram, node.id);
  const project = useProjectStore((state) => state.project);
  const references = useMemo(
    () => (project?.requirementLinks ?? [])
      .filter((link) => link.diagramId === diagram.id && link.elementId === node.id)
      .map((link) => ({ link, requirement: project!.requirements.find((item) => item.id === link.requirementId) }))
      .filter((item) => item.requirement !== undefined),
    [project, diagram.id, node.id],
  );
  const update = (patch: Partial<UseCaseSpec>) => useDiagramStore.getState().updateNode(node.id, { props: withSpec(node.props, { ...spec, ...patch }) });
  const hints = reviewSpec(spec, context, references.length);

  return (
    <section className="min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-6 lg:px-8" aria-label={`Ficha de ${nodeName(node)}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-accent-soft px-2 py-1 text-sm font-semibold tabular-nums text-accent">{spec.code}</span>
        <h3 className="min-w-0 flex-1 truncate text-xl font-semibold text-ink-900">{nodeName(node)}</h3>
        <div role="tablist" aria-label="Vista de la ficha" className="flex rounded-lg bg-canvas p-0.5">
          {([['edit', 'Editar ficha'], ['table', 'Ver ficha']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`h-8 rounded-md px-3 text-xs font-medium ${view === id ? 'bg-surface text-accent shadow-sm' : 'text-ink-600 hover:text-ink-900'}`}>{label}</button>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {view === 'edit'
            ? <SheetForm node={node} spec={spec} context={context} references={references.map((item) => item.requirement!.code)} onChange={update} referencesEditor={<ReferencesEditor diagramId={diagram.id} nodeId={node.id} linked={references.map((item) => ({ linkId: item.link.id, code: item.requirement!.code, title: item.requirement!.title }))} />} />
            : <SheetTable name={nodeName(node)} spec={spec} context={context} references={references.map((item) => item.requirement!.code)} />}
        </div>
        <aside className="space-y-4">
          <section aria-label="Revisión de la ficha" className="rounded-xl border border-line p-4">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-ink-900">Revisión</h4>
              {hints.some((hint) => hint.level === 'warning')
                ? <span className="ml-auto flex items-center gap-1.5 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning"><FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />Incompleta</span>
                : <span className="ml-auto flex items-center gap-1.5 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success"><FontAwesomeIcon icon={faCircleCheck} className="text-[10px]" />{hints.length > 0 ? 'Casi lista' : 'Lista'}</span>}
            </div>
            {hints.length === 0 ? (
              <p className="mt-2 text-xs text-ink-600">La ficha cuenta el caso completo y está trazada a su requisito.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {hints.map((hint) => (
                  <li key={hint.text} className="flex gap-2 text-xs leading-relaxed">
                    <FontAwesomeIcon icon={hint.level === 'warning' ? faTriangleExclamation : faLightbulb} className={`mt-0.5 shrink-0 text-[11px] ${hint.level === 'warning' ? 'text-warning' : 'text-info'}`} />
                    <span className="text-ink-900">{hint.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <LessonLink
            lesson="caso-de-uso"
            label="Cómo se escribe una ficha de caso de uso"
            reminder={USE_CASE_SHEET_TIPS[0]}
            onLeave={() => ui().setUseCaseSheetNodeId(null)}
          />
        </aside>
      </div>
    </section>
  );
}

interface SheetFormProps {
  node: DiagramNode;
  spec: UseCaseSpec;
  context: UseCaseContext;
  references: string[];
  referencesEditor: React.ReactNode;
  onChange: (patch: Partial<UseCaseSpec>) => void;
}

/** La ficha editable, en el orden de la ficha de documento. */
function SheetForm({ node, spec, context, referencesEditor, onChange }: SheetFormProps) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
      <Row label="Caso de uso">
        <div className="flex gap-2">
          <input aria-label="Nombre del caso de uso" defaultValue={nodeName(node)} onBlur={(event) => event.target.value.trim() && useDiagramStore.getState().updateNode(node.id, { label: event.target.value.trim() })} className={inputClass} />
          <input aria-label="Código" defaultValue={spec.code} onBlur={(event) => onChange({ code: event.target.value.trim() || spec.code })} className={`${inputClass} w-24 font-semibold tabular-nums`} />
        </div>
      </Row>
      <Row label="Actores" hint="Se leen del diagrama: quienes están unidos al caso">
        <p className="py-2 text-sm text-ink-900">{context.actors.join(', ') || <span className="text-warning">Ninguno: únelo a un actor en el diagrama</span>}</p>
      </Row>
      <Row label="Propósito">
        <input aria-label="Propósito" defaultValue={spec.purpose} onBlur={(event) => onChange({ purpose: event.target.value.trim() })} placeholder="Registrar los datos de una nueva mascota asociada a un cliente." className={inputClass} />
      </Row>
      <Row label="Tipo">
        <div className="grid grid-cols-2 gap-2">
          <select aria-label="Importancia" value={spec.importance} onChange={(event) => onChange({ importance: event.target.value as UseCaseSpec['importance'] })} className={`${inputClass} capitalize`}>
            {USE_CASE_IMPORTANCE.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select aria-label="Nivel" value={spec.level} onChange={(event) => onChange({ level: event.target.value as UseCaseSpec['level'] })} className={`${inputClass} capitalize`}>
            {USE_CASE_LEVEL.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </Row>
      <Row label="Resumen">
        <textarea aria-label="Resumen" defaultValue={spec.summary} onBlur={(event) => onChange({ summary: event.target.value.trim() })} rows={2} placeholder="El usuario ingresa los datos de una mascota nueva para que quede registrada." className={`${inputClass} resize-y`} />
      </Row>
      <Row label="Precondiciones" hint="Qué debe ser cierto antes de empezar">
        <ListEditor items={spec.preconditions} placeholder="El usuario inició sesión y está en el módulo Mascota." addLabel="Agregar una precondición" onChange={(preconditions) => onChange({ preconditions })} />
      </Row>
      <Row label="Postcondiciones" hint="Cómo queda el sistema al terminar bien">
        <ListEditor items={spec.postconditions} placeholder="Los datos de la mascota quedan guardados." addLabel="Agregar una postcondición" onChange={(postconditions) => onChange({ postconditions })} />
      </Row>
      <Row label="Referencias" hint="Los requisitos que cumple este caso">{referencesEditor}</Row>
      {(context.includes.length > 0 || context.extendedBy.length > 0 || context.extends.length > 0) && (
        <Row label="Relaciones" hint="Se leen del diagrama">
          <div className="space-y-1 py-1 text-sm text-ink-900">
            {context.includes.length > 0 && <p>Incluye: {context.includes.join(', ')}</p>}
            {context.extendedBy.length > 0 && <p>Lo extiende: {context.extendedBy.join(', ')}</p>}
            {context.extends.length > 0 && <p>Extiende a: {context.extends.join(', ')}</p>}
          </div>
        </Row>
      )}
      <Row label="Curso típico de eventos" hint="El camino feliz: actor y sistema se turnan">
        <StepsEditor steps={spec.typicalCourse} onChange={(typicalCourse) => onChange({ typicalCourse })} />
      </Row>
      <Row label="Curso alterno de eventos" hint="Qué pasa si algo falla, y en qué paso">
        <AlternatesEditor flows={spec.alternateCourses} steps={spec.typicalCourse.length} onChange={(alternateCourses) => onChange({ alternateCourses })} />
      </Row>
    </div>
  );
}

/** Pasos del curso típico: numerados, cada uno del actor o del sistema. */
function StepsEditor({ steps, onChange }: { steps: UseCaseStep[]; onChange: (steps: UseCaseStep[]) => void }) {
  const set = (index: number, patch: Partial<UseCaseStep>) => onChange(steps.map((step, position) => (position === index ? { ...step, ...patch } : step)));
  const nextBy = steps.at(-1)?.by === 'actor' ? 'system' : 'actor';
  return (
    <div className="space-y-1.5">
      {steps.map((step, index) => (
        <div key={`${index}-${step.text}`} className={`flex items-start gap-2 ${step.by === 'system' ? 'pl-6' : ''}`}>
          <span className="mt-2 w-5 shrink-0 text-right text-xs font-semibold tabular-nums text-ink-400">{index + 1}.</span>
          <button type="button" onClick={() => set(index, { by: step.by === 'actor' ? 'system' : 'actor' })} title="Cambiar quién lo hace" className={`mt-1 shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${step.by === 'actor' ? 'bg-accent-soft text-accent' : 'bg-info/15 text-info'}`}>
            {step.by === 'actor' ? 'Actor' : 'Sistema'}
          </button>
          <textarea defaultValue={step.text} rows={Math.max(1, Math.ceil(step.text.length / 52))} onBlur={(event) => set(index, { text: event.target.value.trim() })} aria-label={`Paso ${index + 1}`} className={`${inputClass} min-h-9 resize-y`} />
          <button type="button" onClick={() => onChange(steps.filter((_, position) => position !== index))} aria-label={`Quitar el paso ${index + 1}`} className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-danger-soft hover:text-danger">
            <FontAwesomeIcon icon={faXmark} className="text-[11px]" />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2 pt-1">
        {(['actor', 'system'] as const).map((by) => (
          <button key={by} type="button" onClick={() => onChange([...steps, { by, text: '' }])} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${by === nextBy ? 'bg-accent-soft text-accent' : 'text-ink-600 hover:bg-raised'}`}>
            <FontAwesomeIcon icon={faPlus} className="text-[10px]" /> {by === 'actor' ? 'Acción del actor' : 'Respuesta del sistema'}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Cursos alternos: en qué paso se desvían y qué pasa. */
function AlternatesEditor({ flows, steps, onChange }: { flows: AlternateFlow[]; steps: number; onChange: (flows: AlternateFlow[]) => void }) {
  const set = (index: number, patch: Partial<AlternateFlow>) => onChange(flows.map((flow, position) => (position === index ? { ...flow, ...patch } : flow)));
  return (
    <div className="space-y-1.5">
      {flows.map((flow, index) => (
        <div key={`${index}-${flow.text}`} className="flex items-start gap-2">
          <select aria-label="En el paso" value={flow.step} onChange={(event) => set(index, { step: Number(event.target.value) })} className={`${inputClass} w-20 shrink-0`}>
            {Array.from({ length: Math.max(steps, flow.step, 1) }, (_, position) => position + 1).map((number) => <option key={number} value={number}>Paso {number}</option>)}
          </select>
          <textarea defaultValue={flow.text} rows={Math.max(1, Math.ceil(flow.text.length / 52))} onBlur={(event) => set(index, { text: event.target.value.trim() })} placeholder='Si un campo obligatorio no se completa, muestra "Campo requerido".' aria-label={`Curso alterno ${index + 1}`} className={`${inputClass} min-h-9 resize-y`} />
          <button type="button" onClick={() => onChange(flows.filter((_, position) => position !== index))} aria-label="Quitar el curso alterno" className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-danger-soft hover:text-danger">
            <FontAwesomeIcon icon={faXmark} className="text-[11px]" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...flows, { step: Math.max(1, steps), text: '' }])} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent-soft">
        <FontAwesomeIcon icon={faPlus} className="text-[10px]" /> Agregar un curso alterno
      </button>
    </div>
  );
}

/** Requisitos que cumple el caso: vincular y quitar, con la misma fuente que la matriz. */
function ReferencesEditor({ diagramId, nodeId, linked }: { diagramId: string; nodeId: string; linked: { linkId: string; code: string; title: string }[] }) {
  const project = useProjectStore((state) => state.project);
  const [chosen, setChosen] = useState('');
  if (!project || !project.diagramIds.includes(diagramId)) {
    return <p className="py-2 text-xs text-ink-400">Abre el diagrama dentro de un proyecto para vincularlo con sus requisitos.</p>;
  }
  const available = project.requirements.filter((item) => !linked.some((link) => link.code === item.code) && item.status !== 'descartado');
  return (
    <div className="space-y-1.5">
      {linked.map((item) => (
        <div key={item.linkId} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5">
          <button type="button" onClick={() => ui().setRequirementsOpen(true, project.requirements.find((requirement) => requirement.code === item.code)?.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <span className="shrink-0 rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">{item.code}</span>
            <span className="truncate text-sm text-ink-900 hover:text-accent">{item.title}</span>
          </button>
          <button type="button" onClick={() => useProjectStore.getState().unlinkRequirement(item.linkId)} aria-label={`Quitar ${item.code}`} className="flex size-7 items-center justify-center rounded-md text-ink-400 hover:bg-danger-soft hover:text-danger">
            <FontAwesomeIcon icon={faXmark} className="text-[11px]" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <select aria-label="Requisito" value={chosen} onChange={(event) => setChosen(event.target.value)} className={inputClass}>
          <option value="">Vincular un requisito…</option>
          {available.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}
        </select>
        <button type="button" disabled={!chosen} onClick={() => { useProjectStore.getState().linkRequirement(chosen, diagramId, nodeId); setChosen(''); }} aria-label="Vincular" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white disabled:opacity-40">
          <FontAwesomeIcon icon={faPlus} className="text-xs" />
        </button>
      </div>
    </div>
  );
}

/**
 * La ficha como documento: la tabla de datos y el curso típico en dos
 * columnas (actor | sistema), numerado, como en una ficha académica.
 */
export function SheetTable({ name, spec, context, references }: { name: string; spec: UseCaseSpec; context: UseCaseContext; references: string[] }) {
  const [copied, setCopied] = useState(false);
  const rows: [string, string | string[]][] = [
    ['Caso de Uso', `${name} (${spec.code})`],
    ['Actores', context.actors.join(', ') || '—'],
    ['Propósito', spec.purpose || '—'],
    ['Tipo', `${capitalize(spec.importance)} y ${capitalize(spec.level)}`],
    ['Resumen', spec.summary || '—'],
    ['Precondiciones', spec.preconditions.length > 0 ? spec.preconditions : '—'],
    ['Postcondiciones', spec.postconditions.length > 0 ? spec.postconditions : '—'],
    ['Referencias', references.join(', ') || '—'],
  ];
  if (context.includes.length > 0) rows.push(['Incluye', context.includes.join(', ')]);
  if (context.extendedBy.length > 0) rows.push(['Lo extiende', context.extendedBy.join(', ')]);
  const course = spec.typicalCourse.map((step, index) => ({ ...step, number: index + 1 }));
  const pairs: { actor?: (typeof course)[number]; system?: (typeof course)[number] }[] = [];
  for (const step of course) {
    const last = pairs.at(-1);
    if (step.by === 'actor' || !last || last.system) pairs.push(step.by === 'actor' ? { actor: step } : { system: step });
    else last.system = step;
  }

  async function copy() {
    const cell = (value: string | string[]) => (Array.isArray(value) ? `<ul>${value.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : escapeHtml(value));
    const html = `<table border="1" cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:11pt">${rows.map(([label, value]) => `<tr><td style="background:#d9d9d9;font-weight:bold;width:30%">${escapeHtml(label)}</td><td colspan="2">${cell(value)}</td></tr>`).join('')}`
      + `<tr><td colspan="3" style="background:#d9d9d9;font-weight:bold;text-align:center">Curso típico de eventos</td></tr><tr><td colspan="1" style="font-weight:bold;text-align:center">Acciones de los actores</td><td colspan="2" style="font-weight:bold;text-align:center">Respuesta del sistema</td></tr>`
      + pairs.map((pair) => `<tr><td>${pair.actor ? `${pair.actor.number}. ${escapeHtml(pair.actor.text)}` : ''}</td><td colspan="2">${pair.system ? `${pair.system.number}. ${escapeHtml(pair.system.text)}` : ''}</td></tr>`).join('')
      + `<tr><td colspan="3" style="background:#d9d9d9;font-weight:bold;text-align:center">Curso alterno de eventos</td></tr>`
      + (spec.alternateCourses.length > 0 ? spec.alternateCourses.map((flow) => `<tr><td style="text-align:center;font-weight:bold">${flow.step}.</td><td colspan="2">${escapeHtml(flow.text)}</td></tr>`).join('') : '<tr><td colspan="3">—</td></tr>')
      + '</table>';
    const text = [
      ...rows.map(([label, value]) => `${label}: ${Array.isArray(value) ? value.join('; ') : value}`),
      'Curso típico de eventos:',
      ...course.map((step) => `  ${step.number}. [${step.by === 'actor' ? 'Actor' : 'Sistema'}] ${step.text}`),
      'Curso alterno de eventos:',
      ...spec.alternateCourses.map((flow) => `  ${flow.step}. ${flow.text}`),
    ].join('\n');
    if (await copyTable(html, text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  const head = 'border border-line bg-raised px-3 py-2 align-top text-[13px] font-semibold text-ink-900';
  const cellClass = 'border border-line px-3 py-2 align-top text-sm text-ink-900';
  return (
    <div>
      <div className="mb-2 flex items-center">
        <p className="text-[11px] text-ink-400">Así queda en un documento. Cópiala y pégala en Word o Google Docs.</p>
        <button type="button" onClick={() => void copy()} className="ml-auto flex items-center gap-1.5 rounded-md bg-accent-soft px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent hover:text-white">
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-[10px]" /> {copied ? 'Copiada' : 'Copiar ficha'}
        </button>
      </div>
      <table className="w-full border-collapse">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th scope="row" className={`${head} w-44 text-left`}>{label}</th>
              <td colSpan={2} className={cellClass}>{Array.isArray(value) ? <ul className="list-disc space-y-1 pl-4">{value.map((item) => <li key={item}>{item}</li>)}</ul> : value}</td>
            </tr>
          ))}
          <tr><th colSpan={3} className={`${head} text-center`}>Curso típico de eventos</th></tr>
          <tr><th className={`${head} text-center`}>Acciones de los actores</th><th colSpan={2} className={`${head} text-center`}>Respuesta del sistema</th></tr>
          {pairs.length === 0 ? (
            <tr><td colSpan={3} className={`${cellClass} text-ink-400`}>Sin pasos todavía.</td></tr>
          ) : pairs.map((pair, index) => (
            <tr key={index}>
              <td className={cellClass}>{pair.actor && `${pair.actor.number}. ${pair.actor.text}`}</td>
              <td colSpan={2} className={cellClass}>{pair.system && `${pair.system.number}. ${pair.system.text}`}</td>
            </tr>
          ))}
          <tr><th colSpan={3} className={`${head} text-center`}>Curso alterno de eventos</th></tr>
          {spec.alternateCourses.length === 0 ? (
            <tr><td colSpan={3} className={`${cellClass} text-ink-400`}>Sin cursos alternos.</td></tr>
          ) : spec.alternateCourses.map((flow, index) => (
            <tr key={index}>
              <td className={`${cellClass} w-16 text-center font-semibold`}>{flow.step}.</td>
              <td colSpan={2} className={cellClass}>{flow.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
