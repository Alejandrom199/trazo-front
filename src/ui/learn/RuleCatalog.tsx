import type { Severity } from '@/core/model';
import type { DiagramModule } from '@/core/registry';

const SEVERITY: Record<Severity, { label: string; className: string }> = {
  error: { label: 'Error', className: 'bg-danger-soft text-danger' },
  warning: { label: 'Advertencia', className: 'bg-warning-soft text-warning' },
  info: { label: 'Sugerencia', className: 'bg-info/10 text-info' },
};
const ORDER: Severity[] = ['error', 'warning', 'info'];

/** Las reglas que revisa el validador, explicadas: qué detecta y por qué es un problema. */
export function RuleCatalog({ module }: { module: DiagramModule }) {
  const rules = [...module.rules].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rules.map((rule) => (
        <article key={rule.id} className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink-900">{rule.title}</h3>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${SEVERITY[rule.severity].className}`}>
              {SEVERITY[rule.severity].label}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{rule.explanation}</p>
        </article>
      ))}
    </div>
  );
}
