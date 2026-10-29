import { ReactFlowProvider } from '@xyflow/react';
import { DiagramCanvas } from '@/canvas/DiagramCanvas';
import { ExplanationPanel } from '@/ui/explanation/ExplanationPanel';
import { NarrationPanel } from '@/ui/narration/NarrationPanel';
import { PalettePanel } from '@/ui/palette/PalettePanel';
import { TemplateGallery } from '@/ui/templates/TemplateGallery';
import { TopBar } from '@/ui/toolbar/TopBar';
import { useUiStore } from '@/ui/uiStore';
import { ValidationPanel } from '@/ui/validation/ValidationPanel';

/**
 * Lienzo a pantalla completa con los paneles flotando encima.
 * `pointer-events-none` en las capas contenedoras deja pasar el ratón al lienzo
 * en los huecos; cada panel lo reactiva para sí mismo.
 */
export function AppShell() {
  const narrationOpen = useUiStore((state) => state.narrationOpen);
  const notice = useUiStore((state) => state.notice);

  return (
    <ReactFlowProvider>
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        <DiagramCanvas />
      </div>

      <div className="pointer-events-none absolute inset-x-3 top-3 *:pointer-events-auto">
        <TopBar />
      </div>

      <div className="pointer-events-none absolute top-[4.5rem] bottom-3 left-3 flex flex-col *:pointer-events-auto">
        <PalettePanel />
      </div>

      <div className="pointer-events-none absolute top-[4.5rem] right-3 bottom-3 flex flex-col items-end *:pointer-events-auto">
        {narrationOpen ? <NarrationPanel /> : <ExplanationPanel />}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center *:pointer-events-auto">
        <ValidationPanel />
      </div>

      {notice && (
        <div
          role="status"
          className="pointer-events-none absolute top-[4.5rem] left-1/2 z-40 max-w-md -translate-x-1/2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink-600 shadow-panel"
        >
          {notice}
        </div>
      )}

      <TemplateGallery />
    </div>
    </ReactFlowProvider>
  );
}
