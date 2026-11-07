import { faCheck, faChevronDown, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useMemo, useState } from 'react';
import { issueKey, validateDiagram, type Severity, type ValidationIssue, type ValidationRule } from '@/core/model';
import { useActiveModule } from '@/canvas/useActiveModule';
import { useDiagramStore } from '@/core/store/diagramStore';
import { createId } from '@/core/utils/id';
import { useHighlightStore } from '@/canvas/highlightStore';

const SEVERITY_STYLE: Record<Severity, { singular: string; plural: string; dot: string; text: string }> = {
  error: { singular: 'error', plural: 'errores', dot: 'bg-danger', text: 'text-danger' },
  warning: { singular: 'advertencia', plural: 'advertencias', dot: 'bg-warning', text: 'text-warning' },
  info: { singular: 'sugerencia', plural: 'sugerencias', dot: 'bg-info', text: 'text-info' },
};
const SEVERITIES: Severity[] = ['error', 'warning', 'info'];
const ISSUE_PREFIX = 'issue:';

/**
 * Panel de problemas, abajo al centro. Valida en vivo con las reglas del módulo
 * activo. Plegado muestra solo los contadores; desplegado, la lista. Al hacer
 * clic en un problema se seleccionan y resaltan sus elementos en el lienzo; si la
 * regla sabe corregirlo, «Arreglar» lo hace en un paso de deshacer y deja
 * seleccionado lo que agregó, para que se vea la corrección.
 */
export function ValidationPanel({ embedded = false }: { embedded?: boolean }) {
  const module = useActiveModule();
  const diagram = useDiagramStore((state) => state.diagram);
  const highlight = useHighlightStore((state) => state.highlight);
  const setHighlight = useHighlightStore((state) => state.setHighlight);
  const [expanded, setExpanded] = useState(false);
  const showingIssues = embedded || expanded;

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

  function fixIssue(issue: ValidationIssue) {
    const fix = issue.fix;
    const store = useDiagramStore.getState();
    const before = store.diagram;
    if (!fix || !before) return;
    store.applyChange((current) => fix.apply(current, createId));
    const after = useDiagramStore.getState().diagram;
    if (!after || after === before) return;
    const known = { nodes: new Set(before.nodes.map((node) => node.id)), edges: new Set(before.edges.map((edge) => edge.id)) };
    const added = { nodeIds: after.nodes.filter((node) => !known.nodes.has(node.id)).map((node) => node.id), edgeIds: after.edges.filter((edge) => !known.edges.has(edge.id)).map((edge) => edge.id) };
    // Lo nuevo, o si solo se cambió algo existente, los elementos del problema.
    store.setSelection(added.nodeIds.length + added.edgeIds.length > 0 ? added : { nodeIds: issue.nodeIds, edgeIds: issue.edgeIds });
  }

  return (
    <div className={embedded ? 'flex h-full w-full min-w-0 flex-col overflow-hidden bg-surface' : 'w-full min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-panel'}>
      {showingIssues && (
        <ul className={embedded ? 'order-2 min-h-0 flex-1 divide-y divide-line overflow-y-auto' : 'max-h-[38vh] divide-y divide-line overflow-y-auto border-b border-line'}>
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
                onFix={() => fixIssue(issue)}
              />
            ))
          )}
        </ul>
      )}

      <button
        type="button"
        onClick={() => !embedded && setExpanded(!expanded)}
        aria-expanded={showingIssues}
        className={`flex h-11 w-full shrink-0 items-center gap-3 px-4 text-left sm:gap-4 ${embedded ? 'order-1 cursor-default border-b border-line' : 'hover:bg-raised'}`}
      >
        <span className="text-xs font-semibold text-ink-600">Problemas</span>
        {issues.length === 0 ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-success">
            <FontAwesomeIcon icon={faCheck} className="text-[11px]" />
            {diagram.nodes.length === 0 ? 'Nada que revisar' : 'Todo en orden'}
          </span>
        ) : (
          counts
            .filter(({ count }) => count > 0)
            .map(({ severity, count }) => (
              <span key={severity} className="flex items-center gap-1.5 text-xs text-ink-600">
                <span className={`size-2 rounded-full ${SEVERITY_STYLE[severity].dot}`} />
                <span className="font-medium text-ink-900">{count}</span>
                {/* En pantallas angostas basta el punto de color y el número. */}
                <span className="hidden sm:inline">
                  {count === 1 ? SEVERITY_STYLE[severity].singular : SEVERITY_STYLE[severity].plural}
                </span>
              </span>
            ))
        )}
        {!embedded && (
          <FontAwesomeIcon
            icon={faChevronDown}
            className={`ml-auto text-[11px] text-ink-400 transition-transform ${expanded ? '' : 'rotate-180'}`}
          />
        )}
      </button>
    </div>
  );
}

interface IssueItemProps {
  issue: ValidationIssue;
  rule: ValidationRule | undefined;
  active: boolean;
  onFocus: () => void;
  onFix: () => void;
}

function IssueItem({ issue, rule, active, onFocus, onFix }: IssueItemProps) {
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
          {issue.fix && (
            <button
              type="button"
              onClick={onFix}
              title="Se puede deshacer con Ctrl+Z"
              className="mt-1.5 mr-3 inline-flex items-center gap-1.5 rounded-md bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent hover:text-white"
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[10px]" />
              Arreglar: {issue.fix.label.charAt(0).toLowerCase() + issue.fix.label.slice(1)}
            </button>
          )}
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
