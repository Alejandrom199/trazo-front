import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faArrowUpRightFromSquare, faBookOpen, faChevronRight, faLink, faListCheck, faLock, faLockOpen, faSliders, faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useActiveModule } from '@/canvas/useActiveModule';
import { createDiagramFromTemplate, linkedTemplateId, validateDiagram, type DiagramNode } from '@/core/model';
import { diagramRegistry } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { EdgeProperties, NodeProperties } from '@/ui/explanation/ElementProperties';
import { EdgeTypeSelect } from '@/ui/explanation/EdgeTypeSelect';
import { ExplanationPanel } from '@/ui/explanation/ExplanationPanel';
import { NarrationPanel } from '@/ui/narration/NarrationPanel';
import { SelectionPanel } from '@/ui/selection/SelectionPanel';
import { TraceabilityPanel } from '@/ui/traceability/TraceabilityPanel';
import { useDialogBehavior } from '@/ui/dialogs/useDialogBehavior';
import { useUiStore, type InspectorTab } from '@/ui/uiStore';
import { ValidationPanel } from '@/ui/validation/ValidationPanel';

const TABS: { id: InspectorTab; label: string; icon: IconDefinition }[] = [
  { id: 'properties', label: 'Propiedades', icon: faSliders },
  { id: 'explanation', label: 'Explicación', icon: faBookOpen },
  { id: 'problems', label: 'Problemas', icon: faTriangleExclamation },
  { id: 'narration', label: 'Narración', icon: faListCheck },
  { id: 'traceability', label: 'Vínculos', icon: faLink },
];

/** Inspector estable: conserva su lugar mientras cambia el contenido seleccionado. */
export function InspectorDock() {
  const open = useUiStore((state) => state.inspectorOpen);
  const setOpen = useUiStore((state) => state.setInspectorOpen);
  const tab = useUiStore((state) => state.inspectorTab);
  const setTab = useUiStore((state) => state.setInspectorTab);
  const diagram = useDiagramStore((state) => state.diagram);
  const module = useActiveModule();
  const issueCount = useMemo(() => (diagram && module ? validateDiagram(diagram, module.rules).length : 0), [diagram, module]);
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 1023px)').matches);
  const sheetRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), [setOpen]);
  useDialogBehavior(open && narrow, sheetRef, close);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)');
    const apply = () => setNarrow(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  if (!open) return null;

  const dock = (sheet: boolean) => (
    <aside aria-label="Inspector" className={`flex shrink-0 flex-col bg-surface ${sheet ? 'h-[min(78dvh,640px)] w-full' : 'h-full w-[22rem] border-l border-line'}`}>
      <header className="flex h-14 shrink-0 items-center border-b border-line px-2">
        <div role="tablist" aria-label="Inspector del diagrama" className="grid min-w-0 flex-1 grid-cols-5 gap-0.5">
          {TABS.map((item) => {
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                title={item.label}
                onClick={() => setTab(item.id)}
                className={`relative flex h-10 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                  active ? 'bg-accent-soft text-accent' : 'text-ink-400 hover:bg-raised hover:text-ink-900'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="text-xs" />
                <span className="truncate">{item.label}</span>
                {item.id === 'problems' && issueCount > 0 && (
                  <span className="absolute right-1.5 top-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] leading-4 text-white">
                    {issueCount > 99 ? '99+' : issueCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Ocultar inspector"
          title="Ocultar inspector"
          className="ml-1 hidden size-11 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-raised hover:text-ink-900 lg:flex"
        >
          <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar inspector"
          className="ml-1 flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-raised hover:text-ink-900 lg:hidden"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'properties' && <PropertiesContent />}
        {tab === 'explanation' && <ExplanationPanel embedded alwaysOpen />}
        {tab === 'problems' && <ValidationPanel embedded />}
        {tab === 'narration' && <NarrationPanel embedded />}
        {tab === 'traceability' && <TraceabilityPanel />}
      </div>
    </aside>
  );

  if (narrow) {
    return (
      <div className="fixed inset-0 z-40 flex items-end bg-black/35 backdrop-blur-[1px]" onMouseDown={(event) => event.target === event.currentTarget && close()}>
        <div ref={sheetRef} role="dialog" aria-modal="true" aria-label="Inspector" tabIndex={-1} className="w-full overflow-hidden rounded-t-2xl border-t border-line shadow-panel outline-none">
          {dock(true)}
        </div>
      </div>
    );
  }

  return <div className="h-full">{dock(false)}</div>;
}

function PropertiesContent() {
  const module = useActiveModule();
  const diagram = useDiagramStore((state) => state.diagram);
  const selection = useDiagramStore((state) => state.selection);
  if (!module || !diagram) return null;
  const total = selection.nodeIds.length + selection.edgeIds.length;
  if (total === 0) return <EmptyInspector title="Nada seleccionado" text="Selecciona una figura o una conexión para editar sus propiedades." />;
  if (total > 1) return <SelectionPanel embedded />;

  const node = selection.nodeIds[0] ? diagram.nodes.find((item) => item.id === selection.nodeIds[0]) : undefined;
  const edge = selection.edgeIds[0] ? diagram.edges.find((item) => item.id === selection.edgeIds[0]) : undefined;
  const element = node ?? edge;
  if (!element) return <EmptyInspector title="La selección ya no existe" text="Selecciona otro elemento del lienzo." />;
  const definition = module.artifacts.find((artifact) => artifact.type === element.artifactType);
  if (!definition) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            {edge ? (
              <>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Tipo</p>
                <EdgeTypeSelect
                  edgeId={edge.id}
                  artifactType={edge.artifactType}
                  module={module}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink-900 outline-none focus:border-accent/50"
                />
                {!module.edgeKinds[edge.artifactType]?.switchableTo?.length && (
                  <p className="mt-1 text-sm font-semibold text-ink-900">{definition.name}</p>
                )}
                <p className="mt-0.5 truncate text-xs text-ink-400">{definition.umlName}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-ink-900">{definition.name}</p>
                <p className="truncate text-xs text-ink-400">{element.label.trim() || definition.umlName}</p>
              </>
            )}
          </div>
          {node && <NodeHeaderActions node={node} />}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {node ? (
          <NodeProperties node={node} diagram={diagram} module={module} />
        ) : edge ? (
          <EdgeProperties edge={edge} diagram={diagram} module={module} />
        ) : null}
      </div>
    </div>
  );
}

function NodeHeaderActions({ node }: { node: DiagramNode }) {
  const templateId = linkedTemplateId(node.props);
  const template = templateId
    ? diagramRegistry.list().flatMap((entry) => entry.templates).find((candidate) => candidate.id === templateId)
    : undefined;
  const lockLabel = node.locked ? 'Desbloquear elemento' : 'Bloquear elemento';
  return (
    <div className="flex items-center gap-1">
      {template && (
        <button
          type="button"
          onClick={() => useDiagramStore.getState().openDiagram(createDiagramFromTemplate(template))}
          title={`Abrir detalle: ${template.name}`}
          aria-label={`Abrir diagrama relacionado: ${template.name}`}
          className="flex size-8 items-center justify-center rounded-lg text-xs text-accent hover:bg-accent-soft"
        >
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
        </button>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={node.locked}
        onClick={() => useDiagramStore.getState().updateNode(node.id, { locked: !node.locked })}
        title={lockLabel}
        aria-label={lockLabel}
        className={`flex size-8 items-center justify-center rounded-lg text-xs ${node.locked ? 'bg-brand text-white' : 'text-ink-400 hover:bg-raised hover:text-ink-900'}`}
      >
        <FontAwesomeIcon icon={node.locked ? faLock : faLockOpen} />
      </button>
    </div>
  );
}

function EmptyInspector({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-canvas text-ink-400">
        <FontAwesomeIcon icon={faSliders} />
      </span>
      <p className="text-sm font-medium text-ink-900">{title}</p>
      <p className="mt-1 max-w-56 text-xs leading-relaxed text-ink-600">{text}</p>
    </div>
  );
}

export function InspectorToggle() {
  const open = useUiStore((state) => state.inspectorOpen);
  const setOpen = useUiStore((state) => state.setInspectorOpen);
  if (open) return null;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Mostrar inspector"
      title="Mostrar inspector"
      className="glass-panel relative flex h-11 items-center gap-2 rounded-xl px-3.5 text-[13px] text-ink-600 hover:text-accent"
    >
      <FontAwesomeIcon icon={faSliders} />
      <span className="hidden sm:inline">Inspector</span>
    </button>
  );
}
