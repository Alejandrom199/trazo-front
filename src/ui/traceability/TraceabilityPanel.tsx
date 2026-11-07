import { faArrowUpRightFromSquare, faLink, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useMemo, useState } from 'react';
import type { Diagram, TraceEndpoint, TraceLink, TraceRelation } from '@/core/model';
import { diagramRegistry } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';

const RELATIONS: TraceRelation[] = ['detalla', 'implementa', 'verifica', 'depende de', 'relacionado con'];

/** Vínculos semánticos entre elementos de distintos diagramas del proyecto. */
export function TraceabilityPanel() {
  const project = useProjectStore((state) => state.project);
  const repository = usePersistenceStore((state) => state.repository);
  const current = useDiagramStore((state) => state.diagram);
  const selection = useDiagramStore((state) => state.selection);
  const [targetDiagramId, setTargetDiagramId] = useState('');
  const [targetElementKey, setTargetElementKey] = useState('');
  const [relation, setRelation] = useState<TraceRelation>('detalla');

  const diagrams = useMemo(() => {
    if (!project) return [];
    return project.diagramIds
      .map((id) => current?.id === id ? current : repository?.load(id))
      .filter((diagram): diagram is Diagram => diagram !== null && diagram !== undefined);
  }, [project, current, repository]);
  const otherDiagrams = diagrams.filter((diagram) => diagram.id !== current?.id);

  useEffect(() => {
    if (!otherDiagrams.some((diagram) => diagram.id === targetDiagramId)) setTargetDiagramId(otherDiagrams[0]?.id ?? '');
  }, [otherDiagrams, targetDiagramId]);
  useEffect(() => setTargetElementKey(''), [targetDiagramId]);

  if (!project || !current) {
    return <Empty text="Crea un proyecto para relacionar elementos de varios diagramas." />;
  }
  if (!project.diagramIds.includes(current.id)) {
    return <Empty text="Añade este diagrama al proyecto antes de crear vínculos." />;
  }

  const selected = selectedEndpoint(current, selection.nodeIds, selection.edgeIds);
  const links = selected ? project.traceLinks.filter((link) => sameEndpoint(link.source, selected) || sameEndpoint(link.target, selected)) : [];
  const targetDiagram = otherDiagrams.find((diagram) => diagram.id === targetDiagramId);
  const targetElements = targetDiagram ? elementsOf(targetDiagram) : [];

  function addLink() {
    if (!selected || !targetDiagram || !targetElementKey) return;
    const [kind, elementId] = targetElementKey.split(':', 2) as ['node' | 'edge', string];
    useProjectStore.getState().addTraceLink(selected, { diagramId: targetDiagram.id, elementId, kind }, relation);
    setTargetElementKey('');
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-line px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-sm font-semibold text-ink-900">Trazabilidad del proyecto</p><p className="text-xs text-ink-400">{project.traceLinks.length} {project.traceLinks.length === 1 ? 'vínculo' : 'vínculos'}</p></div>
          <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-xs text-accent"><FontAwesomeIcon icon={faLink} /></span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Coverage diagrams={diagrams} links={project.traceLinks} />

        <section className="border-t border-line p-4">
          <h3 className="text-xs font-semibold text-ink-900">Elemento seleccionado</h3>
          {!selected ? (
            <p className="mt-2 text-xs leading-relaxed text-ink-600">Selecciona un solo elemento para ver o crear sus vínculos.</p>
          ) : (
            <>
              <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-sm text-ink-900">{endpointLabel(selected, diagrams)}</p>
              {links.length === 0 ? <p className="mt-3 text-xs text-ink-400">Todavía no tiene correspondencias.</p> : (
                <ul className="mt-3 space-y-2">
                  {links.map((link) => {
                    const outgoing = sameEndpoint(link.source, selected);
                    const other = outgoing ? link.target : link.source;
                    return (
                      <li key={link.id} className="flex items-start gap-2 rounded-lg border border-line px-3 py-2.5">
                        <button type="button" onClick={() => openEndpoint(other, diagrams)} className="min-w-0 flex-1 text-left">
                          <span className="block text-[11px] text-ink-400">{outgoing ? link.relation : `recibe: ${link.relation}`}</span>
                          <span className="mt-0.5 block truncate text-sm text-ink-900 hover:text-accent">{endpointLabel(other, diagrams)}</span>
                        </button>
                        <button type="button" onClick={() => openEndpoint(other, diagrams)} aria-label="Abrir elemento vinculado" className="flex size-11 items-center justify-center rounded-md text-ink-400 hover:bg-raised hover:text-accent"><FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[11px]" /></button>
                        <button type="button" onClick={() => useProjectStore.getState().removeTraceLink(link.id)} aria-label="Eliminar vínculo" className="flex size-11 items-center justify-center rounded-md text-ink-400 hover:bg-danger-soft hover:text-danger"><FontAwesomeIcon icon={faTrashCan} className="text-[11px]" /></button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-5 border-t border-line pt-4">
                <h3 className="text-xs font-semibold text-ink-900">Crear vínculo</h3>
                {otherDiagrams.length === 0 ? <p className="mt-2 text-xs leading-relaxed text-ink-600">Añade otro diagrama al proyecto para crear una correspondencia.</p> : (
                  <div className="mt-3 space-y-3">
                    <Field label="Relación"><select value={relation} onChange={(event) => setRelation(event.target.value as TraceRelation)} className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent">{RELATIONS.map((item) => <option key={item}>{item}</option>)}</select></Field>
                    <Field label="Diagrama destino"><select value={targetDiagramId} onChange={(event) => setTargetDiagramId(event.target.value)} className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent">{otherDiagrams.map((diagram) => <option key={diagram.id} value={diagram.id}>{diagram.name}</option>)}</select></Field>
                    <Field label="Elemento destino"><select value={targetElementKey} onChange={(event) => setTargetElementKey(event.target.value)} className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent"><option value="">Elige un elemento…</option>{targetElements.map((element) => <option key={`${element.kind}:${element.id}`} value={`${element.kind}:${element.id}`}>{element.label}</option>)}</select></Field>
                    <button type="button" disabled={!targetElementKey} onClick={addLink} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-40"><FontAwesomeIcon icon={faPlus} className="text-xs" /> Crear vínculo</button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Coverage({ diagrams, links }: { diagrams: Diagram[]; links: TraceLink[] }) {
  const linked = new Map<string, Set<string>>();
  for (const link of links) for (const endpoint of [link.source, link.target]) linked.set(endpoint.diagramId, new Set([...(linked.get(endpoint.diagramId) ?? []), endpoint.elementId]));
  return <section className="p-4"><h3 className="text-xs font-semibold text-ink-900">Cobertura</h3><div className="mt-3 space-y-2">{diagrams.map((diagram) => { const total = diagram.nodes.length + diagram.edges.length; const count = linked.get(diagram.id)?.size ?? 0; const percent = total ? Math.round(count / total * 100) : 0; return <div key={diagram.id}><div className="flex justify-between gap-3 text-xs"><span className="truncate text-ink-600">{diagram.name}</span><span className="shrink-0 text-ink-400">{count}/{total}</span></div><div className="mt-1 h-1 overflow-hidden rounded-full bg-raised"><div className="h-full bg-accent" style={{ width: `${percent}%` }} /></div></div>; })}</div></section>;
}

function selectedEndpoint(diagram: Diagram, nodeIds: string[], edgeIds: string[]): TraceEndpoint | null {
  if (nodeIds.length + edgeIds.length !== 1) return null;
  return nodeIds[0] ? { diagramId: diagram.id, elementId: nodeIds[0], kind: 'node' } : { diagramId: diagram.id, elementId: edgeIds[0]!, kind: 'edge' };
}

function elementsOf(diagram: Diagram) {
  const module = diagramRegistry.get(diagram.diagramType);
  return [
    ...diagram.nodes.map((node) => ({ id: node.id, kind: 'node' as const, label: node.label.trim() || module.artifacts.find((item) => item.type === node.artifactType)?.name || 'Nodo sin nombre' })),
    ...diagram.edges.map((edge) => ({ id: edge.id, kind: 'edge' as const, label: edge.label.trim() || edge.guard || module.artifacts.find((item) => item.type === edge.artifactType)?.name || 'Conexión' })),
  ];
}

function endpointLabel(endpoint: TraceEndpoint, diagrams: Diagram[]): string {
  const diagram = diagrams.find((item) => item.id === endpoint.diagramId);
  const element = diagram && elementsOf(diagram).find((item) => item.id === endpoint.elementId);
  return diagram ? `${diagram.name} · ${element?.label ?? 'Elemento eliminado'}` : 'Diagrama no disponible';
}

function sameEndpoint(a: TraceEndpoint, b: TraceEndpoint) { return a.diagramId === b.diagramId && a.elementId === b.elementId && a.kind === b.kind; }

function openEndpoint(endpoint: TraceEndpoint, diagrams: Diagram[]) {
  const diagram = diagrams.find((item) => item.id === endpoint.diagramId);
  if (!diagram) return;
  const current = useDiagramStore.getState().diagram;
  const persistence = usePersistenceStore.getState();
  if (current && persistence.repository) persistence.repository.save(current);
  useDiagramStore.getState().openDiagram(diagram);
  useDiagramStore.getState().setSelection(endpoint.kind === 'node' ? { nodeIds: [endpoint.elementId], edgeIds: [] } : { nodeIds: [], edgeIds: [endpoint.elementId] });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-[11px] font-medium text-ink-400">{label}</span>{children}</label>; }
function Empty({ text }: { text: string }) { return <div className="flex h-full flex-col items-center justify-center px-8 text-center"><span className="mb-3 flex size-10 items-center justify-center rounded-full bg-canvas text-ink-400"><FontAwesomeIcon icon={faLink} /></span><p className="max-w-56 text-sm leading-relaxed text-ink-600">{text}</p></div>; }
