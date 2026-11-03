import { useState, type KeyboardEvent, type ReactNode } from 'react';
import type { EdgeRouting, LineStyle } from '@/core/model';
import { dashArrayFor } from '@/canvas/edgePath';

/**
 * Campos de los formularios de propiedades (un elemento o varios a la vez).
 * Cada campo confirma al pulsar Enter o al salir de él; Escape descarta lo escrito.
 */

export const ROUTING_OPTIONS: { value: EdgeRouting; label: string; icon: ReactNode }[] = [
  { value: 'orthogonal', label: 'Ortogonal', icon: <RoutingIcon d="M3 15 V8 H15 V3" /> },
  { value: 'straight', label: 'Recta', icon: <RoutingIcon d="M3 15 L9 5 L15 12" /> },
  { value: 'curved', label: 'Curva', icon: <RoutingIcon d="M3 15 C5 3, 13 3, 15 12" /> },
];

export const LINE_OPTIONS: { value: LineStyle; label: string; icon: ReactNode }[] = [
  { value: 'solid', label: 'Continua', icon: <LineIcon /> },
  { value: 'dashed', label: 'Discontinua', icon: <LineIcon dash={dashArrayFor('dashed')} /> },
  { value: 'dotted', label: 'Punteada', icon: <LineIcon dash={dashArrayFor('dotted')} round /> },
];

function RoutingIcon({ d }: { d: string }) {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LineIcon({ dash, round = false }: { dash?: string; round?: boolean }) {
  return (
    <svg width={22} height={18} viewBox="0 0 22 18" aria-hidden>
      <line x1={2} y1={9} x2={20} y2={9} stroke="currentColor" strokeWidth={2} strokeDasharray={dash} strokeLinecap={round ? 'round' : 'butt'} />
    </svg>
  );
}

/** Grupo de botones excluyentes (como pestañas pequeñas). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-lg bg-canvas p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[11px] transition-colors ${
            value === option.value ? 'bg-surface font-medium text-accent shadow-sm' : 'text-ink-600 hover:text-ink-900'
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Como Field, pero sin <label>: para grupos de botones (una etiqueta activaría el primero). */
export function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] leading-relaxed text-ink-400">{hint}</span>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-accent/50 focus:ring-2 focus:ring-accent/15 disabled:bg-canvas disabled:text-ink-400';

/** Enter confirma (en multilínea, Mayús+Enter salta de línea); Escape descarta lo escrito. */
function useDraft<T>(value: T, onCommit: (value: T) => void, equals: (a: T, b: T) => boolean = Object.is) {
  const [draft, setDraft] = useState<{ base: T; text: T } | null>(null);
  // El borrador solo vale mientras el valor externo no cambie (p. ej. al deshacer).
  const current = draft && equals(draft.base, value) ? draft.text : value;
  return {
    current,
    change: (text: T) => setDraft({ base: value, text }),
    commit: () => {
      if (draft && !equals(draft.text, value)) onCommit(draft.text);
      setDraft(null);
    },
    discard: () => setDraft(null),
  };
}

export function TextInput({
  value,
  multiline = false,
  placeholder,
  onCommit,
}: {
  value: string;
  multiline?: boolean;
  placeholder?: string;
  onCommit: (value: string) => void;
}) {
  const draft = useDraft(value, (text) => onCommit(text.trim()));
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      draft.discard();
    }
    if (event.key === 'Enter' && !(multiline && event.shiftKey)) {
      event.preventDefault();
      draft.commit();
    }
  };
  const shared = {
    value: draft.current,
    placeholder,
    onChange: (event: { target: { value: string } }) => draft.change(event.target.value),
    onBlur: draft.commit,
    onKeyDown,
    className: inputClass,
  };
  return multiline ? <textarea rows={3} {...shared} className={`${inputClass} resize-none`} /> : <input {...shared} />;
}

export function NumberInput({
  prefix,
  value,
  min = -Infinity,
  max = Infinity,
  disabled,
  onCommit,
}: {
  prefix: string;
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onCommit: (value: number) => void;
}) {
  const shown = String(Math.round(value));
  const draft = useDraft(shown, (text) => {
    const parsed = Number(text);
    if (text.trim() === '' || !Number.isFinite(parsed)) return;
    onCommit(Math.min(max, Math.max(min, parsed)));
  });
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[11px] font-medium text-ink-400">{prefix}</span>
      <input
        type="number"
        inputMode="numeric"
        disabled={disabled}
        value={draft.current}
        onChange={(event) => draft.change(event.target.value)}
        onBlur={draft.commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') draft.commit();
          if (event.key === 'Escape') {
            event.stopPropagation();
            draft.discard();
          }
        }}
        className={`${inputClass} pl-8 tabular-nums`}
      />
    </div>
  );
}
