import { ReactFlowProvider } from '@xyflow/react';
import { DiagramCanvas } from '@/canvas/DiagramCanvas';
import { CanvasContextMenu } from '@/ui/canvasMenu/CanvasContextMenu';
import { InspectorDock, InspectorToggle } from '@/ui/inspector/InspectorDock';
import { LearnPage } from '@/ui/learn/LearnPage';
import { useRoute } from '@/ui/navigation/route';
import { PalettePanel } from '@/ui/palette/PalettePanel';
import { ProjectSidebar, ProjectSidebarToggle } from '@/ui/projects/ProjectSidebar';
import { TemplateGallery } from '@/ui/templates/TemplateGallery';
import { TooltipLayer } from '@/ui/tooltip/TooltipLayer';
import { CommandPalette } from '@/ui/commands/CommandPalette';
import { ArtifactsToggle, CanvasSelectionToolbar, ZoomControls } from '@/ui/toolbar/CanvasSelectionToolbar';
import { CanvasViewControl } from '@/ui/toolbar/CanvasViewControl';
import { GridControl } from '@/ui/toolbar/GridControl';
import { LayersControl } from '@/ui/layers/LayersControl';
import { EditorTutorial } from '@/ui/tutorial/EditorTutorial';
import { useUiStore } from '@/ui/uiStore';
import { ProjectPanel } from '@/ui/projects/ProjectPanel';
import { AppHeader } from './AppHeader';

/**
 * Mesa de trabajo: navegador del proyecto, lienzo e inspector estable. Los dos
 * laterales se integran como columnas en escritorio y como paneles superpuestos
 * en pantallas angostas. Aprender ocupa el área de trabajo sin desmontar el lienzo.
 */
export function AppShell() {
  const notice = useUiStore((state) => state.notice);
  const artifactToolsVisible = useUiStore((state) => state.artifactToolsVisible);
  const route = useRoute();
  const inEditor = route.page === 'editor';

  return (
    <ReactFlowProvider>
      <div className="flex h-full w-full flex-col overflow-hidden">
        <AppHeader />
        <div className="relative flex min-h-0 flex-1">
          {inEditor && <ProjectSidebar />}
          <div className="relative flex min-w-0 flex-1">
            <main className="relative min-w-0 flex-1 overflow-hidden bg-board">
              <div className="absolute inset-0">
                <DiagramCanvas />
              </div>

              {/* Herramientas compactas; los botones de restaurar laterales aparecen solo al plegarlos. */}
              <div className="absolute top-3 left-3 z-10 flex items-start gap-2">
                <ProjectSidebarToggle />
                <ArtifactsToggle />
                <LayersControl />
              </div>
              <div className="absolute top-3 right-3 z-10">
                <InspectorToggle />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
                <div className="glass-panel pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-xl p-1">
                  {/* Sin overflow: recortaría los menús «Vista» y «Cuadrícula», que se abren hacia arriba. */}
                  <CanvasSelectionToolbar embedded />
                  <ZoomControls />
                  <CanvasViewControl />
                  <GridControl />
                </div>
              </div>
              <EditorTutorial />

              {/* Herramientas de dibujo, bajo las de selección (se ocultan con su botón o la tecla A). */}
              {artifactToolsVisible && (
                <div className="absolute top-[4.25rem] left-3 z-10">
                  <PalettePanel />
                </div>
              )}

              {notice && (
                <div
                  role="status"
                  className="pointer-events-none absolute top-3 left-1/2 z-40 max-w-md -translate-x-1/2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm text-ink-600 shadow-panel"
                >
                  {notice}
                </div>
              )}
            </main>
            {!inEditor && <LearnPage route={route} />}
          </div>
          {inEditor && <InspectorDock />}
        </div>

        {route.page === 'editor' && (
          <>
            <CanvasContextMenu />
            <TemplateGallery />
            <ProjectPanel />
          </>
        )}
        <CommandPalette />
        <TooltipLayer />
      </div>
    </ReactFlowProvider>
  );
}
