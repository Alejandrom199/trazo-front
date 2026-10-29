import { diagramRegistry } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { Panel } from '@/ui/layout/Panel';

export function TopBar() {
  const diagram = useDiagramStore((state) => state.diagram);
  const renameDiagram = useDiagramStore((state) => state.renameDiagram);

  const moduleName = diagram ? diagramRegistry.get(diagram.diagramType).displayName : null;

  return (
    <Panel className="flex h-12 items-center gap-3 px-3">
      <div className="flex items-center gap-2">
        <img src="/favicon.svg" alt="" className="size-6" />
        <span className="text-sm font-semibold tracking-tight">Trazo</span>
      </div>

      <span className="h-5 w-px bg-line" aria-hidden />

      {diagram && (
        <>
          <input
            value={diagram.name}
            onChange={(event) => renameDiagram(event.target.value)}
            aria-label="Nombre del diagrama"
            className="field-sizing-content min-w-24 max-w-md rounded-lg px-2 py-1 text-sm font-medium outline-none hover:bg-canvas focus:bg-canvas focus:ring-2 focus:ring-accent/20"
          />
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
            {moduleName}
          </span>
        </>
      )}
    </Panel>
  );
}
