import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMemo, useState } from 'react';
import type { NarrationLine } from '@/core/model';
import { useHighlightStore } from '@/canvas/highlightStore';
import { useActiveModule } from '@/canvas/useActiveModule';
import { useDiagramStore } from '@/core/store/diagramStore';
import { Panel } from '@/ui/layout/Panel';
import { useUiStore } from '@/ui/uiStore';

const NARRATION_PREFIX = 'narration:';

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

  const lines = useMemo(() => (diagram && module ? module.narrate(diagram) : []), [diagram, module]);
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
    <Panel className="flex max-h-full w-full flex-col overflow-hidden md:w-96">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">Narración</h2>
        <div className="ml-auto flex items-center gap-1">
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

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {lines.length === 0 ? (
          <p className="px-2 text-sm leading-relaxed text-ink-600">
            Dibuja el proceso y aquí aparecerá contado paso a paso, desde el nodo inicial.
          </p>
        ) : (
          <ol className="space-y-0.5">
            {lines.map((line, index) => {
              const active = highlight?.sourceKey === `${NARRATION_PREFIX}${index}`;
              const isHeading = line.text.endsWith(':');
              return (
                <li key={index} style={{ paddingLeft: line.depth * 16 }}>
                  <button
                    type="button"
                    onClick={() => focusLine(line, index)}
                    className={`w-full rounded-lg px-2 py-1 text-left text-sm leading-relaxed transition-colors ${
                      active ? 'bg-accent-soft text-accent' : 'text-ink-900 hover:bg-canvas'
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
