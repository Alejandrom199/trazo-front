import { ReactFlowProvider } from '@xyflow/react';
import { DiagramCanvas } from '@/canvas/DiagramCanvas';
import { CanvasContextMenu } from '@/ui/canvasMenu/CanvasContextMenu';
import { CanvasArtifactPopover } from '@/ui/explanation/CanvasArtifactPopover';
import { ExplanationPanel } from '@/ui/explanation/ExplanationPanel';
import { LearnPage } from '@/ui/learn/LearnPage';
import { useRoute } from '@/ui/navigation/route';
import { NarrationPanel } from '@/ui/narration/NarrationPanel';
import { PalettePanel } from '@/ui/palette/PalettePanel';
import { TemplateGallery } from '@/ui/templates/TemplateGallery';
import { TopBar } from '@/ui/toolbar/TopBar';
import { useUiStore } from '@/ui/uiStore';
import { ValidationPanel } from '@/ui/validation/ValidationPanel';
import { NavRail } from './NavRail';

/**
 * Estructura de la pantalla, de izquierda a derecha: riel de navegación, paleta
 * fija y el área del lienzo. Dentro del lienzo flotan la barra del documento, el
 * panel de explicación/narración y el de problemas; `pointer-events-none` en sus
 * capas deja pasar el ratón al lienzo en los huecos. La página Aprender se
 * superpone a paleta y lienzo sin desmontarlos.
 */
export function AppShell() {
  const narrationOpen = useUiStore((state) => state.narrationOpen);
  const notice = useUiStore((state) => state.notice);
  const route = useRoute();

  return (
    <ReactFlowProvider>
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="relative flex min-h-0 flex-1">
          <NavRail />
          <div className="relative flex min-w-0 flex-1">
            <PalettePanel />

            <main className="relative min-w-0 flex-1 overflow-hidden">
              <div className="absolute inset-0">
                <DiagramCanvas />
              </div>

              <div className="pointer-events-none absolute inset-x-3 top-3 z-20 *:pointer-events-auto">
                <TopBar />
              </div>

              <div className="pointer-events-none absolute top-[4.25rem] right-3 bottom-3 left-3 flex flex-col items-end *:pointer-events-auto md:left-auto">
                {narrationOpen ? <NarrationPanel /> : <ExplanationPanel />}
              </div>

              <div className="pointer-events-none absolute right-3 bottom-3 left-14 flex justify-center *:pointer-events-auto md:left-3 lg:right-[22rem]">
                <ValidationPanel />
              </div>

              {notice && (
                <div
                  role="status"
                  className="pointer-events-none absolute top-[4.25rem] left-1/2 z-40 max-w-md -translate-x-1/2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm text-ink-600 shadow-panel"
                >
                  {notice}
                </div>
              )}
            </main>
            {route.page !== 'editor' && <LearnPage route={route} />}
          </div>
        </div>

        {route.page === 'editor' && (
          <>
            <CanvasArtifactPopover />
            <CanvasContextMenu />
            <TemplateGallery />
          </>
        )}
      </div>
    </ReactFlowProvider>
  );
}
