import { ReactFlowProvider } from '@xyflow/react';
import { DiagramCanvas } from '@/canvas/DiagramCanvas';
import { useDiagramStore } from '@/core/store/diagramStore';
import { CanvasContextMenu } from '@/ui/canvasMenu/CanvasContextMenu';
import { CanvasArtifactPopover } from '@/ui/explanation/CanvasArtifactPopover';
import { ExplanationPanel } from '@/ui/explanation/ExplanationPanel';
import { LearnPage } from '@/ui/learn/LearnPage';
import { useRoute } from '@/ui/navigation/route';
import { NarrationPanel } from '@/ui/narration/NarrationPanel';
import { PalettePanel } from '@/ui/palette/PalettePanel';
import { SelectionPanel } from '@/ui/selection/SelectionPanel';
import { TemplateGallery } from '@/ui/templates/TemplateGallery';
import { TooltipLayer } from '@/ui/tooltip/TooltipLayer';
import { ArtifactsToggle, CanvasSelectionToolbar } from '@/ui/toolbar/CanvasSelectionToolbar';
import { LayersControl } from '@/ui/layers/LayersControl';
import { useUiStore } from '@/ui/uiStore';
import { ValidationPanel } from '@/ui/validation/ValidationPanel';
import { AppHeader } from './AppHeader';

/**
 * Estructura de la pantalla: la barra superior y, debajo, el lienzo con todo el
 * ancho. Sobre el lienzo flotan las herramientas (selección, capas y artefactos),
 * el panel de explicación/narración y el de problemas; `pointer-events-none` en
 * sus capas deja pasar el ratón al lienzo en los huecos. La página Aprender se
 * superpone al lienzo sin desmontarlo.
 */
export function AppShell() {
  const narrationOpen = useUiStore((state) => state.narrationOpen);
  const notice = useUiStore((state) => state.notice);
  const artifactToolsVisible = useUiStore((state) => state.artifactToolsVisible);
  const route = useRoute();
  // Con varios elementos seleccionados, el panel derecho muestra qué hay seleccionado.
  const multipleSelected = useDiagramStore((state) => state.selection.nodeIds.length + state.selection.edgeIds.length > 1);

  return (
    <ReactFlowProvider>
      <div className="flex h-full w-full flex-col overflow-hidden">
        <AppHeader />
        <div className="relative flex min-h-0 flex-1">
          <div className="relative flex min-w-0 flex-1">
            <main className="relative min-w-0 flex-1 overflow-hidden bg-board">
              <div className="absolute inset-0">
                <DiagramCanvas />
              </div>

              {/* Arriba a la izquierda: abajo choca con el panel de problemas. */}
              <div className="absolute top-3 left-3 z-10 flex items-start gap-2">
                <CanvasSelectionToolbar />
                <LayersControl />
                <ArtifactsToggle />
              </div>

              {/* Herramientas de dibujo, bajo las de selección (se ocultan con su botón o la tecla A). */}
              {artifactToolsVisible && (
                <div className="absolute top-[4.25rem] left-3 z-10">
                  <PalettePanel />
                </div>
              )}

              <div className="pointer-events-none absolute top-3 right-3 bottom-3 left-3 flex flex-col items-end *:pointer-events-auto md:left-auto">
                {narrationOpen ? <NarrationPanel /> : multipleSelected ? <SelectionPanel /> : <ExplanationPanel />}
              </div>

              <div className="pointer-events-none absolute right-3 bottom-16 z-20 w-[min(25rem,calc(100%-1.5rem))] *:pointer-events-auto lg:right-[22rem] xl:bottom-3">
                <ValidationPanel />
              </div>

              {notice && (
                <div
                  role="status"
                  className="pointer-events-none absolute top-3 left-1/2 z-40 max-w-md -translate-x-1/2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm text-ink-600 shadow-panel"
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
        <TooltipLayer />
      </div>
    </ReactFlowProvider>
  );
}
