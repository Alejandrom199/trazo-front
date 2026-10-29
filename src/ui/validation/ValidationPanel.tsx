import { useEffect, useMemo, useState } from 'react';
import { issueKey, validateDiagram, type Severity, type ValidationIssue, type ValidationRule } from '@/core/model';
import { useActiveModule } from '@/canvas/useActiveModule';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useHighlightStore } from '@/canvas/highlightStore';

const SEVERITY_STYLE: Record<Severity, { singular: string; plural: string; dot: string; text: string }> = {
  error: { singular: 'error', plural: 'errores', dot: 'bg-rose-500', text: 'text-rose-600' },
  warning: { singular: 'advertencia', plural: 'advertencias', dot: 'bg-amber-500', text: 'text-amber-600' },
  info: { singular: 'sugerencia', plural: 'sugerencias', dot: 'bg-sky-500', text: 'text-sky-600' },
};
const SEVERITIES: Severity[] = ['error', 'warning', 'info'];
const ISSUE_PREFIX = 'issue:';

/**
 * Panel de problemas, abajo al centro. Valida en vivo con las reglas del módulo
 * activo. Plegado muestra solo los contadores; desplegado, la lista. Al hacer
 * clic en un problema se seleccionan y resaltan sus elementos en el lienzo.
 */
export function ValidationPanel() {
  const module = useActiveModule();
  const diagram = useDiagramStore((state) => state.diagram);
  const highlight = useHighlightStore((state) => state.highlight);
  const setHighlight = useHighlightStore((state) => state.setHighlight);
  const [expanded, setExpanded] = useState(false);

  const issues = useMemo(
    () => (diagram && module ? validateDiagram(diagram, module.rules) : []),
    [diagram, module],
  );
  const ruleById = useMemo(() => new Map((module?.rules ?? []).map((rule) => [rule.id, rule])), [module]);

  // Si el problema resaltado se corrigió, el resaltado ya no tiene sentido.
  // Solo se tocan los resaltados que puso este panel (los de la narración son de otro).
  useEffect(() => {
    if (!highlight?.sourceKey.startsWith(ISSUE_PREFIX)) return;
    if (!issues.some((issue) => ISSUE_PREFIX + issueKey(issue) === highlight.sourceKey)) setHighlight(null);
  }, [issues, highlight, setHighlight]);

  if (!diagram || !module) return null;

  const counts = SEVERITIES.map((severity) => ({
    severity,
    count: issues.filter((issue) => issue.severity === severity).length,
  }));

  function focusIssue(issue: ValidationIssue) {
    setHighlight({ sourceKey: ISSUE_PREFIX + issueKey(issue), tone: issue.severity, nodeIds: issue.nodeIds, edgeIds: issue.edgeIds });
    useDiagramStore.getState().setSelection({ nodeIds: issue.nodeIds, edgeIds: issue.edgeIds });
  }

  return (
    <div className="w-[min(560px,calc(100vw-40rem))] min-w-80 overflow-hidden rounded-2xl border border-line bg-surface shadow-panel">
      {expanded && (
        <ul className="max-h-[38vh] divide-y divide-line overflow-y-auto border-b border-line">
          {issues.length === 0 ? (
            <li className="px-4 py-4 text-sm text-ink-600">
              {diagram.nodes.length === 0
                ? 'Agrega artefactos al lienzo: los problemas aparecerán aquí mientras dibujas.'
                : 'Sin problemas: el diagrama cumple todas las reglas revisadas.'}
            </li>
          ) : (
            issues.map((issue) => (
              <IssueItem
                key={issueKey(issue)}
                issue={issue}
                rule={ruleById.get(issue.ruleId)}
                active={highlight?.sourceKey === ISSUE_PREFIX + issueKey(issue)}
                onFocus={() => focusIssue(issue)}
              />
            ))
          )}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex h-11 w-full items-center gap-4 px-4 text-left hover:bg-canvas"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Problemas</span>
        {issues.length === 0 ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {diagram.nodes.length === 0 ? 'Nada que revisar' : 'Todo en orden'}
          </span>
        ) : (
          counts
            .filter(({ count }) => count > 0)
            .map(({ severity, count }) => (
              <span key={severity} className="flex items-center gap-1.5 text-xs text-ink-600">
                <span className={`size-2 rounded-full ${SEVERITY_STYLE[severity].dot}`} />
                <span className="font-medium text-ink-900">{count}</span>{' '}
                {count === 1 ? SEVERITY_STYLE[severity].singular : SEVERITY_STYLE[severity].plural}
              </span>
            ))
        )}
        <svg
          viewBox="0 0 24 24"
          className={`ml-auto size-4 text-ink-400 transition-transform ${expanded ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}

interface IssueItemProps {
  issue: ValidationIssue;
  rule: ValidationRule | undefined;
  active: boolean;
  onFocus: () => void;
}

function IssueItem({ issue, rule, active, onFocus }: IssueItemProps) {
  const [showWhy, setShowWhy] = useState(false);
  const style = SEVERITY_STYLE[issue.severity];
  const hasElements = issue.nodeIds.length + issue.edgeIds.length > 0;

  return (
    <li className={active ? 'bg-accent-soft/60' : undefined}>
      <div className="flex gap-3 px-4 py-3">
        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${style.dot}`} aria-label={issue.severity} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onFocus}
            disabled={!hasElements}
            className="block text-left text-sm text-ink-900 enabled:hover:text-accent disabled:cursor-default"
            title={hasElements ? 'Resaltar en el lienzo' : undefined}
          >
            {issue.message}
          </button>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{issue.suggestion}</p>
          {rule && (
            <>
              <button
                type="button"
                onClick={() => setShowWhy(!showWhy)}
                className={`mt-1 text-[11px] font-medium ${style.text} hover:underline`}
              >
                {showWhy ? 'Ocultar' : '¿Por qué?'}
              </button>
              {showWhy && (
                <p className="mt-1 rounded-lg bg-canvas px-2.5 py-2 text-xs leading-relaxed text-ink-600">
                  <span className="font-medium text-ink-900">{rule.title}. </span>
                  {rule.explanation}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}
