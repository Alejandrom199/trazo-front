import { faCheck, faCircleCheck, faCopy, faLightbulb, faPlus, faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import {
  qualityLevel,
  REQUIREMENT_GUIDES,
  REQUIREMENT_KINDS,
  REQUIREMENT_PRIORITIES,
  REQUIREMENT_STATUSES,
  reviewRequirement,
  RULE_TYPES,
  type Requirement,
  type RequirementKind,
  type RuleExample,
} from '@/core/model';
import { useProjectStore } from '@/core/store/projectStore';
import { inputClass } from '@/ui/explanation/formFields';

type Patch = Partial<Omit<Requirement, 'id' | 'createdAt'>>;
const kindName = (kind: RequirementKind) => REQUIREMENT_KINDS.find((item) => item.id === kind)!.name;

/**
 * La ficha de un requisito, con los campos de una ficha académica clásica:
 * número, título, texto, tipo y categoría, detalles y restricciones, revisión
 * y versión, prioridad y estado. Una regla de negocio suma su propia parte:
 * tipo de regla, fuente, vigencia, excepciones y ejemplos Dado / Entonces.
 */
export function RequirementSheetForm({ requirement }: { requirement: Requirement }) {
  const update = (patch: Patch) => useProjectStore.getState().updateRequirement(requirement.id, patch);
  const guide = REQUIREMENT_GUIDES[requirement.kind];
  const isRule = requirement.kind === 'regla de negocio';
  const updateRule = (patch: Partial<Requirement['rule']>) => update({ rule: { ...requirement.rule, ...patch } });

  return (
    <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
      <Row label="Número">
        <input aria-label="Número" defaultValue={requirement.code} onBlur={(event) => update({ code: event.target.value })} className={`${inputClass} w-32 font-semibold tabular-nums`} />
      </Row>
      <Row label="Título" hint={requirement.kind === 'funcional' ? 'Una acción en infinitivo' : undefined}>
        <input aria-label="Título" defaultValue={requirement.title} onBlur={(event) => update({ title: event.target.value })} placeholder={guide.example.title} className={inputClass} />
      </Row>
      <Row label={isRule ? 'Regla' : 'Texto'} hint={guide.pattern}>
        <textarea aria-label={isRule ? 'Regla' : 'Texto'} defaultValue={requirement.description} onBlur={(event) => update({ description: event.target.value })} rows={2} placeholder={guide.textPlaceholder} className={`${inputClass} resize-y`} />
      </Row>
      <Row label="Tipo">
        <div className="grid gap-2 sm:grid-cols-2">
          <select aria-label="Tipo de requisito" value={requirement.kind} onChange={(event) => update({ kind: event.target.value as RequirementKind })} className={inputClass}>
            {REQUIREMENT_KINDS.map((kind) => <option key={kind.id} value={kind.id}>{kind.name}</option>)}
          </select>
          {isRule ? (
            <select aria-label="Tipo de regla" value={requirement.rule.type} onChange={(event) => updateRule({ type: event.target.value as Requirement['rule']['type'] })} className={inputClass} title={RULE_TYPES.find((type) => type.id === requirement.rule.type)?.hint}>
              {RULE_TYPES.map((type) => <option key={type.id} value={type.id}>{type.name} · {type.hint.toLowerCase()}</option>)}
            </select>
          ) : (
            <>
              <input aria-label="Categoría" list={`categories-${requirement.kind}`} defaultValue={requirement.category} onBlur={(event) => update({ category: event.target.value.trim() })} placeholder="Categoría, p. ej. Administración" className={inputClass} />
              <datalist id={`categories-${requirement.kind}`}>
                {guide.categories.map((category) => <option key={category} value={category} />)}
              </datalist>
            </>
          )}
        </div>
      </Row>
      <Row label={guide.detailsLabel} hint="Uno por línea: lo que debe cumplirse para darlo por hecho">
        <ListEditor items={requirement.details} placeholder={guide.detailsPlaceholder} onChange={(details) => update({ details })} addLabel="Agregar un detalle" />
      </Row>

      {isRule && (
        <>
          <Row label="Fuente" hint="Quién la dicta: política, ley, contrato">
            <input aria-label="Fuente" defaultValue={requirement.rule.source} onBlur={(event) => updateRule({ source: event.target.value.trim() })} placeholder="Reglamento de la biblioteca, art. 12" className={inputClass} />
          </Row>
          <Row label="Vigencia" hint="Vacío: sin límite">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-ink-400">Desde<input type="date" defaultValue={requirement.rule.validFrom} onBlur={(event) => updateRule({ validFrom: event.target.value })} className={`${inputClass} mt-1`} /></label>
              <label className="text-[11px] text-ink-400">Hasta<input type="date" defaultValue={requirement.rule.validTo} onBlur={(event) => updateRule({ validTo: event.target.value })} className={`${inputClass} mt-1`} /></label>
            </div>
          </Row>
          <Row label="Excepciones">
            <ListEditor items={requirement.rule.exceptions} placeholder="Salvo los docentes, que pueden tener 5" onChange={(exceptions) => updateRule({ exceptions })} addLabel="Agregar una excepción" />
          </Row>
          <Row label="Ejemplos" hint="Dado una situación, entonces el resultado">
            <ExamplesEditor examples={requirement.rule.examples} onChange={(examples) => updateRule({ examples })} />
          </Row>
        </>
      )}

      <Row label="Fecha de revisión y versión">
        <div className="grid grid-cols-2 gap-2">
          <input type="date" aria-label="Fecha de revisión" defaultValue={requirement.reviewedAt} onBlur={(event) => update({ reviewedAt: event.target.value })} className={inputClass} />
          <input aria-label="Versión" defaultValue={requirement.version} onBlur={(event) => update({ version: event.target.value.trim() || '1.0' })} placeholder="1.0" className={inputClass} />
        </div>
      </Row>
      <Row label="Prioridad y estado">
        <div className="grid grid-cols-2 gap-2">
          <select aria-label="Prioridad" value={requirement.priority} onChange={(event) => update({ priority: event.target.value as Requirement['priority'] })} className={`${inputClass} capitalize`}>
            {REQUIREMENT_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
          <select aria-label="Estado" value={requirement.status} onChange={(event) => update({ status: event.target.value as Requirement['status'] })} className={`${inputClass} capitalize`}>
            {REQUIREMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
      </Row>
    </div>
  );
}

/** Una fila de la ficha: el nombre del campo a la izquierda, como en una tabla de documento. */
export function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-x-4 gap-y-1.5 px-4 py-3 sm:grid-cols-[11rem_1fr]">
      <div>
        <p className="text-xs font-semibold text-ink-900">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] leading-snug text-ink-400">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Lista editable de textos (detalles, excepciones): cada línea se edita, se quita y se agregan más. */
export function ListEditor({ items, placeholder, addLabel, onChange }: { items: string[]; placeholder: string; addLabel: string; onChange: (items: string[]) => void }) {
  const set = (index: number, value: string) => onChange(items.map((item, position) => (position === index ? value : item)).filter((item) => item.trim() !== ''));
  return (
    <div className="space-y-1.5">
      {items.map((item, index) => (
        <div key={`${index}-${item}`} className="flex items-start gap-2">
          <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ink-400" aria-hidden />
          <textarea defaultValue={item} rows={Math.max(1, Math.ceil(item.length / 48))} onBlur={(event) => set(index, event.target.value)} aria-label={`Línea ${index + 1}`} className={`${inputClass} min-h-9 resize-y`} />
          <button type="button" onClick={() => onChange(items.filter((_, position) => position !== index))} aria-label="Quitar esta línea" className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-danger-soft hover:text-danger">
            <FontAwesomeIcon icon={faXmark} className="text-[11px]" />
          </button>
        </div>
      ))}
      <NewLine placeholder={placeholder} label={addLabel} onAdd={(value) => onChange([...items, value])} />
    </div>
  );
}

/** Campo para agregar una línea: Enter o el botón la suman. */
function NewLine({ placeholder, label, onAdd }: { placeholder: string; label: string; onAdd: (value: string) => void }) {
  const [value, setValue] = useState('');
  const add = () => {
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue('');
  };
  return (
    <div className="flex gap-2">
      <input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), add())} placeholder={placeholder} aria-label={label} className={`${inputClass} border-dashed`} />
      <button type="button" onClick={add} disabled={!value.trim()} title={label} aria-label={label} className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent disabled:opacity-40">
        <FontAwesomeIcon icon={faPlus} className="text-xs" />
      </button>
    </div>
  );
}

/** Ejemplos Dado / Entonces de una regla: cada uno es un caso que la prueba. */
function ExamplesEditor({ examples, onChange }: { examples: RuleExample[]; onChange: (examples: RuleExample[]) => void }) {
  const set = (index: number, patch: Partial<RuleExample>) => onChange(examples.map((example, position) => (position === index ? { ...example, ...patch } : example)));
  return (
    <div className="space-y-2">
      {examples.map((example, index) => (
        <div key={index} className="relative rounded-lg bg-canvas p-2.5 pr-10">
          <label className="block text-[11px] font-semibold text-ink-600">Dado
            <input defaultValue={example.given} onBlur={(event) => set(index, { given: event.target.value })} placeholder="un socio con 3 préstamos activos" className={`${inputClass} mt-1`} />
          </label>
          <label className="mt-2 block text-[11px] font-semibold text-ink-600">Entonces
            <input defaultValue={example.then} onBlur={(event) => set(index, { then: event.target.value })} placeholder="no puede pedir un cuarto préstamo" className={`${inputClass} mt-1`} />
          </label>
          <button type="button" onClick={() => onChange(examples.filter((_, position) => position !== index))} aria-label="Quitar el ejemplo" className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md text-ink-400 hover:bg-danger-soft hover:text-danger">
            <FontAwesomeIcon icon={faXmark} className="text-[11px]" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...examples, { given: '', then: '' }])} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent-soft">
        <FontAwesomeIcon icon={faPlus} className="text-[10px]" /> Agregar un ejemplo
      </button>
    </div>
  );
}

const LEVEL_STYLE = {
  listo: { label: 'Listo', className: 'bg-success-soft text-success', icon: faCircleCheck },
  mejorable: { label: 'Se puede mejorar', className: 'bg-info/15 text-info', icon: faLightbulb },
  incompleto: { label: 'Incompleto', className: 'bg-warning-soft text-warning', icon: faTriangleExclamation },
} as const;

/** Revisor de calidad: lo que falta para que el requisito sea verificable, mientras se escribe. */
export function QualityPanel({ requirement }: { requirement: Requirement }) {
  const hints = reviewRequirement(requirement);
  const level = LEVEL_STYLE[qualityLevel(hints)];
  return (
    <section aria-label="Calidad del requisito" className="rounded-xl border border-line p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold text-ink-900">Calidad</h3>
        <span className={`ml-auto flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${level.className}`}>
          <FontAwesomeIcon icon={level.icon} className="text-[10px]" /> {level.label}
        </span>
      </div>
      {hints.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-ink-600">Está escrito como una obligación verificable y tiene sus criterios. Bien.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {hints.map((hint, index) => (
            <li key={index} className="flex gap-2 text-xs leading-relaxed">
              <FontAwesomeIcon icon={hint.level === 'warning' ? faTriangleExclamation : faLightbulb} className={`mt-0.5 shrink-0 text-[11px] ${hint.level === 'warning' ? 'text-warning' : 'text-info'}`} />
              <span className="text-ink-900">{hint.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Filas de la ficha en tabla, en el orden de un documento. Es la misma fuente para verla y para copiarla. */
export function sheetRows(requirement: Requirement, fulfilledBy: string[]): [string, string | string[]][] {
  const isRule = requirement.kind === 'regla de negocio';
  const type = isRule
    ? `${kindName(requirement.kind)} - ${RULE_TYPES.find((item) => item.id === requirement.rule.type)!.name}`
    : [kindName(requirement.kind), requirement.category].filter(Boolean).join(' - ');
  const reviewed = [requirement.reviewedAt ? formatDate(requirement.reviewedAt) : 'Sin revisar', `Versión ${requirement.version}`];
  const rows: [string, string | string[]][] = [
    ['Número', requirement.code],
    ['Título', requirement.title],
    [isRule ? 'Regla' : 'Texto', requirement.description || '—'],
    ['Tipo', type],
    [REQUIREMENT_GUIDES[requirement.kind].detailsLabel, requirement.details.length > 0 ? requirement.details : '—'],
  ];
  if (isRule) {
    rows.push(['Fuente', requirement.rule.source || '—']);
    rows.push(['Vigencia', requirement.rule.validFrom || requirement.rule.validTo ? `${requirement.rule.validFrom ? formatDate(requirement.rule.validFrom) : 'Siempre'} – ${requirement.rule.validTo ? formatDate(requirement.rule.validTo) : 'sin fin'}` : 'Sin límite']);
    if (requirement.rule.exceptions.length > 0) rows.push(['Excepciones', requirement.rule.exceptions]);
    rows.push(['Ejemplos', requirement.rule.examples.length > 0 ? requirement.rule.examples.map((example) => `Dado ${example.given}, entonces ${example.then}.`) : '—']);
  }
  rows.push(['Fecha de revisión y versión', reviewed]);
  rows.push(['Prioridad', capitalize(requirement.priority)]);
  rows.push(['Estado', capitalize(requirement.status)]);
  if (fulfilledBy.length > 0) rows.push(['Lo cumple', fulfilledBy]);
  return rows;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return year && month && day ? `${Number(day)}/${Number(month)}/${year}` : iso;
}
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * La ficha como tabla de documento, igual que en un informe. «Copiar» la deja
 * en el portapapeles como tabla (HTML) y como texto: al pegarla en Word o
 * Google Docs conserva las filas y columnas.
 */
export function RequirementSheetTable({ requirement, fulfilledBy }: { requirement: Requirement; fulfilledBy: string[] }) {
  const [copied, setCopied] = useState(false);
  const rows = sheetRows(requirement, fulfilledBy);

  async function copy() {
    const html = `<table border="1" cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:11pt">${rows
      .map(([label, value]) => `<tr><td style="background:#d9d9d9;font-weight:bold;width:30%">${escape(label)}:</td><td>${Array.isArray(value) ? `<ul>${value.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>` : escape(value)}</td></tr>`)
      .join('')}</table>`;
    const text = rows.map(([label, value]) => `${label}: ${Array.isArray(value) ? `\n${value.map((item) => `  • ${item}`).join('\n')}` : value}`).join('\n');
    try {
      if ('ClipboardItem' in window) {
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Sin permiso de portapapeles: la tabla sigue a la vista para copiarla a mano.
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center">
        <p className="text-[11px] text-ink-400">Así queda en un documento. Cópiala y pégala en Word o Google Docs.</p>
        <button type="button" onClick={() => void copy()} className="ml-auto flex items-center gap-1.5 rounded-md bg-accent-soft px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent hover:text-white">
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-[10px]" /> {copied ? 'Copiada' : 'Copiar ficha'}
        </button>
      </div>
      <table className="w-full border-collapse overflow-hidden rounded-lg text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th scope="row" className="w-48 border border-line bg-raised px-3 py-2.5 text-left align-top text-[13px] font-semibold text-ink-900">{label}:</th>
              <td className="border border-line px-3 py-2.5 align-top text-ink-900">
                {Array.isArray(value) ? (
                  <ul className="list-disc space-y-1 pl-4">{value.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
