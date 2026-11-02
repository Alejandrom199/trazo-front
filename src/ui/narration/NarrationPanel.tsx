import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowRight,
  faCodeBranch,
  faCompress,
  faDiamond,
  faFlagCheckered,
  faLayerGroup,
  faPlay,
  faTriangleExclamation,
  faUsers,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMemo, useState } from 'react';
import type { NarrationKind, NarrationLine } from '@/core/model';
import { useHighlightStore } from '@/canvas/highlightStore';
import { useActiveModule } from '@/canvas/useActiveModule';
import { useDiagramStore } from '@/core/store/diagramStore';
import { Panel } from '@/ui/layout/Panel';
import { useUiStore } from '@/ui/uiStore';

const NARRATION_PREFIX = 'narration:';
type NarrationView = 'visual' | 'text';

const KIND_PRESENTATION: Record<NarrationKind, { label: string; icon: IconDefinition; marker: string }> = {
  start: { label: 'Inicio', icon: faPlay, marker: 'border-accent/40 bg-accent-soft text-accent' },
  participants: { label: 'Participantes', icon: faUsers, marker: 'border-accent/40 bg-accent-soft text-accent' },
  step: { label: 'Paso', icon: faArrowRight, marker: 'border-line bg-surface text-ink-600' },
  decision: { label: 'Decisión', icon: faDiamond, marker: 'border-warning/40 bg-warning-soft text-warning' },
  branch: { label: 'Alternativa', icon: faCodeBranch, marker: 'border-line bg-raised text-ink-600' },
  parallel: { label: 'En paralelo', icon: faLayerGroup, marker: 'border-accent/40 bg-accent-soft text-accent' },
  merge: { label: 'Reunión', icon: faCompress, marker: 'border-line bg-raised text-ink-600' },
  end: { label: 'Final', icon: faFlagCheckered, marker: 'border-success/40 bg-success-soft text-success' },
  warning: { label: 'Atención', icon: faTriangleExclamation, marker: 'border-danger/40 bg-danger-soft text-danger' },
};

function isNumbered(line: NarrationLine): boolean {
  return line.depth === 0 && ['step', 'decision', 'parallel', 'end'].includes(line.kind);
}

/**
 * "Explicar diagrama": la narración del módulo activo, recalculada en vivo.
 * Clic en una línea = resalta (y el lienzo encuadra) los elementos que describe.
 */
export function NarrationPanel() {
  const module = useActiveModule();
  const diagram = useDiagramStore((state) => state.diagram);
  const setNarrationOpen = useUiStore((state) => state.setNarrationOpen);
  const highlight = useHighlightStore((state) => state.highlight);
  const setHighlight = useHighlightStore((state) => state.setHighlight);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<NarrationView>('visual');

  const lines = useMemo(() => (diagram && module ? module.narrate(diagram) : []), [diagram, module]);
  const stepNumbers = useMemo(() => {
    let number = 0;
    return lines.map((line) => (isNumbered(line) ? ++number : null));
  }, [lines]);
  if (!diagram || !module) return null;

  function focusLine(line: NarrationLine, index: number) {
    if (line.nodeIds.length + line.edgeIds.length === 0) return;
    setHighlight({ sourceKey: `${NARRATION_PREFIX}${index}`, tone: 'focus', nodeIds: line.nodeIds, edgeIds: line.edgeIds });
    // El lienzo encuadra solo los elementos resaltados.
    useDiagramStore.getState().setSelection({ nodeIds: line.nodeIds, edgeIds: line.edgeIds });
  }

  async function copyText() {
    const text = lines.map((line) => `${'  '.repeat(line.depth)}${line.text}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Sin permiso de portapapeles: el texto sigue visible para copiarlo a mano.
    }
  }

  function close() {
    if (highlight?.sourceKey.startsWith(NARRATION_PREFIX)) setHighlight(null);
    setNarrationOpen(false);
  }

  return (
    <Panel className="flex max-h-full w-full flex-col overflow-hidden md:w-[420px]">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">Narración</h2>
        <div className="ml-auto flex items-center gap-1">
          <div role="group" aria-label="Vista de la narración" className="flex rounded-md bg-canvas p-0.5">
            {(['visual', 'text'] as const).map((option) => {
              const active = view === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setView(option)}
                  aria-pressed={active}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                    active ? 'bg-surface text-accent shadow-sm' : 'text-ink-400 hover:text-ink-900'
                  }`}
                >
                  {option === 'visual' ? 'Visual' : 'Texto'}
                </button>
              );
            })}
          </div>
          {lines.length > 0 && (
            <button
              type="button"
              onClick={copyText}
              className="rounded-md px-2 py-1 text-xs text-ink-600 hover:bg-canvas hover:text-ink-900"
            >
              {copied ? 'Copiado' : 'Copiar texto'}
            </button>
          )}
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar narración"
            className="flex size-6 items-center justify-center rounded-md text-ink-400 hover:bg-canvas hover:text-ink-900"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {lines.length === 0 ? (
          <p className="px-1 text-sm leading-relaxed text-ink-600">
            Dibuja el proceso y aquí aparecerá contado paso a paso, desde el nodo inicial.
          </p>
        ) : view === 'visual' ? (
          <ol className="pr-1 pl-3">
              {lines.map((line, index) => {
                const active = highlight?.sourceKey === `${NARRATION_PREFIX}${index}`;
                const canFocus = line.nodeIds.length + line.edgeIds.length > 0;
                const presentation = KIND_PRESENTATION[line.kind];
                const stepNumber = stepNumbers[index];
                return (
                  <li
                    key={index}
                    style={{ marginLeft: line.depth * 12 }}
                    className="relative pb-0.5 before:absolute before:top-6 before:bottom-[-2px] before:left-[17px] before:w-px before:bg-line last:before:hidden"
                  >
                    <button
                      type="button"
                      onClick={() => focusLine(line, index)}
                      aria-current={active ? 'step' : undefined}
                      aria-disabled={!canFocus}
                      className={`relative flex w-full items-start gap-2 rounded-md py-1 pr-1.5 pl-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                        active ? 'bg-accent-soft text-accent' : canFocus ? 'text-ink-900 hover:bg-canvas' : 'cursor-default text-ink-900'
                      }`}
                    >
                      <span
                        className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
                          active ? 'border-brand bg-brand text-white' : presentation.marker
                        }`}
                        aria-hidden
                      >
                        {stepNumber ?? <FontAwesomeIcon icon={presentation.icon} className="text-[9px]" />}
                      </span>
                      <span className="min-w-0 pt-px">
                        {line.kind !== 'step' && (
                          <span className={`mr-1.5 text-[9px] font-semibold ${active ? 'text-accent' : 'text-ink-400'}`}>
                            {presentation.label}
                          </span>
                        )}
                        <span className={`text-sm leading-snug ${line.kind === 'branch' ? 'font-medium' : ''}`}>
                          {line.text}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
          </ol>
        ) : (
          <ol className="space-y-0.5 px-1">
            {lines.map((line, index) => {
              const active = highlight?.sourceKey === `${NARRATION_PREFIX}${index}`;
              const canFocus = line.nodeIds.length + line.edgeIds.length > 0;
              const isHeading = line.text.endsWith(':');
              return (
                <li key={index} style={{ paddingLeft: line.depth * 16 }}>
                  <button
                    type="button"
                    onClick={() => focusLine(line, index)}
                    aria-current={active ? 'step' : undefined}
                    aria-disabled={!canFocus}
                    className={`w-full rounded-md px-2 py-1 text-left text-sm leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                      active ? 'bg-accent-soft text-accent' : canFocus ? 'text-ink-900 hover:bg-canvas' : 'cursor-default text-ink-900'
                    } ${isHeading ? 'font-medium' : ''} ${line.depth > 0 ? 'border-l border-line' : ''}`}
                  >
                    {line.text}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <footer className="border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-ink-400">
        Narración automática y determinista: se genera recorriendo el diagrama, sin IA. Haz clic en una línea para verla en el lienzo.
      </footer>
    </Panel>
  );
}
