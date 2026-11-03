import { faLock, faLockOpen, faTrashCan, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMemo } from 'react';
import { useActiveModule } from '@/canvas/useActiveModule';
import { EDGE_OFFSET_KEY, readEdgeOffset, type DiagramEdge, type DiagramNode, type EdgePatch, type NodePatch } from '@/core/model';
import { readNumberProperty, type DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { ArtifactFigure } from '@/ui/artifacts/ArtifactFigure';
import { Field, FieldGroup, inputClass, LINE_OPTIONS, NumberInput, ROUTING_OPTIONS, Segmented, TextInput } from '@/ui/explanation/formFields';
import { Panel } from '@/ui/layout/Panel';
import { EdgeFigure } from '@/ui/artifacts/EdgeFigure';
import { ArrangeTools } from './ArrangeTools';
import { commonValue, summarizeSelection, type SelectionGroup } from './selectionSummary';

const MIXED = 'Varios';
const MIN_SIZE = 6;
const store = () => useDiagramStore.getState();

/**
 * Panel derecho de la selección múltiple: qué hay seleccionado, agrupado por
 * tipo. Con artefactos distintos solo se pueden bloquear o desbloquear juntos;
 * si todos son del mismo tipo, además se editan sus propiedades a la vez (cada
 * cambio es un solo paso de deshacer). Los campos que difieren dicen "Varios".
 */
export function SelectionPanel() {
  const module = useActiveModule();
  const diagram = useDiagramStore((state) => state.diagram);
  const selection = useDiagramStore((state) => state.selection);
  const summary = useMemo(() => (diagram ? summarizeSelection(diagram, selection) : null), [diagram, selection]);
  if (!module || !summary) return null;

  const total = summary.nodes.length + summary.edges.length;
  const nameOf = (type: string) => module.artifacts.find((artifact) => artifact.type === type)?.name ?? type;

  return (
    <Panel className="flex max-h-full w-full flex-col overflow-hidden md:w-80">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">Selección</h2>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">{total}</span>
        <button
          type="button"
          onClick={() => store().removeElements(store().selection)}
          aria-label="Eliminar lo seleccionado"
          title={
            summary.nodes.some((node) => node.locked)
              ? 'Eliminar lo seleccionado (Supr). Lo bloqueado y los carriles que lo contienen se conservan'
              : 'Eliminar lo seleccionado (Supr)'
          }
          className="ml-auto flex size-6 items-center justify-center rounded-md text-ink-400 hover:bg-danger-soft hover:text-danger"
        >
          <FontAwesomeIcon icon={faTrashCan} className="text-xs" />
        </button>
        <button
          type="button"
          onClick={() => store().setSelection({ nodeIds: [], edgeIds: [] })}
          aria-label="Quitar la selección"
          title="Quitar la selección"
          className="flex size-6 items-center justify-center rounded-md text-ink-400 hover:bg-canvas hover:text-ink-900"
        >
          <FontAwesomeIcon icon={faXmark} className="text-sm" />
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <section aria-label="Elementos seleccionados" className="space-y-3">
          {summary.groups.map((group) => (
            <GroupRow key={`${group.kind}-${group.artifactType}`} group={group} module={module} name={nameOf(group.artifactType)} />
          ))}
        </section>

        {summary.nodes.length > 0 && <LockAll nodes={summary.nodes} />}

        <ArrangeTools nodes={summary.nodes} module={module} />

        {summary.sameType ? (
          <section className="space-y-4 border-t border-line pt-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              Propiedades de {summary.sameType.elements.length} × {nameOf(summary.sameType.artifactType)}
            </h3>
            {summary.sameType.kind === 'node' ? (
              <SharedNodeProperties nodes={summary.sameType.elements} module={module} />
            ) : (
              <SharedEdgeProperties edges={summary.sameType.elements} module={module} />
            )}
          </section>
        ) : (
          <p className="text-xs leading-relaxed text-ink-400">
            Son artefactos distintos: solo puedes bloquearlos o desbloquearlos juntos. Selecciona elementos del mismo tipo
            para cambiar sus propiedades a la vez.
          </p>
        )}
      </div>
    </Panel>
  );
}

/** Un tipo de artefacto con su figura y cada elemento seleccionado; clic en uno lo deja solo a él. */
function GroupRow({ group, module, name }: { group: SelectionGroup; module: DiagramModule; name: string }) {
  const kind = group.kind === 'node' ? module.nodeKinds[group.artifactType] : undefined;
  const selectOnly = (id: string) =>
    store().setSelection(group.kind === 'node' ? { nodeIds: [id], edgeIds: [] } : { nodeIds: [], edgeIds: [id] });
  /** Quita un solo elemento de la selección; el resto sigue seleccionado. */
  const deselect = (id: string) => {
    const { selection } = store();
    store().setSelection({ nodeIds: selection.nodeIds.filter((other) => other !== id), edgeIds: selection.edgeIds.filter((other) => other !== id) });
  };

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-10 shrink-0 items-center justify-center rounded-md bg-canvas">
          {kind ? (
            <ArtifactFigure kind={kind} artifactType={group.artifactType} box={{ width: 30, height: 20 }} />
          ) : (
            <EdgeFigure kind={module.edgeKinds[group.artifactType]} box={{ width: 30, height: 20 }} />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">{name}</span>
        <span className="text-xs tabular-nums text-ink-400">× {group.elements.length}</span>
      </div>
      <ul className="mt-1.5 space-y-0.5 pl-[3.125rem]">
        {group.elements.map((element: DiagramNode | DiagramEdge) => (
          <li key={element.id} className="group/row flex items-center rounded-md hover:bg-raised">
            <button
              type="button"
              onClick={() => selectOnly(element.id)}
              title="Seleccionar solo este"
              className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-1 text-left text-xs text-ink-600 hover:text-accent"
            >
              {'locked' in element && element.locked && <FontAwesomeIcon icon={faLock} className="text-[9px]" />}
              <span className="truncate">{element.label.trim() || 'sin nombre'}</span>
            </button>
            <button
              type="button"
              onClick={() => deselect(element.id)}
              aria-label={`Quitar «${element.label.trim() || 'sin nombre'}» de la selección`}
              title="Quitar de la selección"
              className="mr-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] text-ink-400 hover:bg-surface hover:text-ink-900"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Bloquea o desbloquea todos los nodos seleccionados (las flechas no se bloquean). */
function LockAll({ nodes }: { nodes: DiagramNode[] }) {
  const allLocked = nodes.every((node) => node.locked);
  const count = nodes.length === 1 ? '1 nodo' : `${nodes.length} nodos`;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={allLocked}
      onClick={() => store().updateNodes(nodes.map((node) => ({ id: node.id, patch: { locked: !allLocked } })))}
      className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        allLocked ? 'bg-brand text-white' : 'border border-line text-ink-900 hover:border-accent/50 hover:text-accent'
      }`}
    >
      <FontAwesomeIcon icon={allLocked ? faLock : faLockOpen} className="text-xs" />
      {allLocked ? `Desbloquear ${count}` : `Bloquear ${count}`}
    </button>
  );
}

/** Propiedades comunes de varios nodos del mismo tipo. */
function SharedNodeProperties({ nodes, module }: { nodes: DiagramNode[]; module: DiagramModule }) {
  const kind = module.nodeKinds[nodes[0]!.artifactType];
  const update = (patchFor: (node: DiagramNode) => NodePatch) => store().updateNodes(nodes.map((node) => ({ id: node.id, patch: patchFor(node) })));
  const anyLocked = nodes.some((node) => node.locked);
  const width = commonValue(nodes.map((node) => node.size.width));
  const height = commonValue(nodes.map((node) => node.size.height));

  return (
    <>
      {kind?.hasLabel && (
        <Field label={kind.labelCaption ?? 'Nombre'} hint="Se escribe el mismo texto en todos">
          <TextInput value={commonValue(nodes.map((node) => node.label)) ?? ''} placeholder={MIXED} onCommit={(label) => update(() => ({ label }))} />
        </Field>
      )}
      {kind?.resizable && (
        <Field label="Tamaño" hint={anyLocked ? 'Hay nodos bloqueados: desbloquéalos para cambiar su tamaño' : undefined}>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput prefix="An" value={width} placeholder={MIXED} min={MIN_SIZE} disabled={anyLocked} onCommit={(value) => update((node) => ({ size: { ...node.size, width: value } }))} />
            <NumberInput prefix="Al" value={height} placeholder={MIXED} min={MIN_SIZE} disabled={anyLocked} onCommit={(value) => update((node) => ({ size: { ...node.size, height: value } }))} />
          </div>
        </Field>
      )}
      {kind?.properties.map((property) => (
        <Field key={property.key} label={property.label} hint={`Entre ${property.min} y ${property.max}${property.unit ?? ''}`}>
          <NumberInput
            prefix={property.unit ?? ''}
            value={commonValue(nodes.map((node) => readNumberProperty(node, property)))}
            placeholder={MIXED}
            min={property.min}
            max={property.max}
            onCommit={(value) => update((node) => ({ props: { ...node.props, [property.key]: value } }))}
          />
        </Field>
      ))}
    </>
  );
}

/** Propiedades comunes de varias flechas del mismo tipo. */
function SharedEdgeProperties({ edges, module }: { edges: DiagramEdge[]; module: DiagramModule }) {
  const kind = module.edgeKinds[edges[0]!.artifactType];
  const update = (patchFor: (edge: DiagramEdge) => EdgePatch) => store().updateEdges(edges.map((edge) => ({ id: edge.id, patch: patchFor(edge) })));
  const defaultStyle = kind?.dashed ? 'dashed' : 'solid';
  const alternatives = (kind?.switchableTo ?? [])
    .map((type) => module.artifacts.find((artifact) => artifact.type === type))
    .filter((artifact) => artifact !== undefined);
  const current = module.artifacts.find((artifact) => artifact.type === edges[0]!.artifactType);

  return (
    <>
      {alternatives.length > 0 && current && (
        <Field label="Tipo">
          <select
            value={current.type}
            onChange={(event) => update(() => ({ artifactType: event.target.value, lineStyle: null }))}
            className={inputClass}
          >
            {[current, ...alternatives.filter((artifact) => artifact.type !== current.type)].map((artifact) => (
              <option key={artifact.type} value={artifact.type}>
                {artifact.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {kind?.layout === 'horizontal' ? (
        <Field label="Altura" hint="Pone todos los mensajes a la misma altura">
          <NumberInput
            prefix="Y"
            value={commonValue(edges.map(readEdgeOffset))}
            placeholder={MIXED}
            min={0}
            onCommit={(offset) => update((edge) => ({ props: { ...edge.props, [EDGE_OFFSET_KEY]: offset } }))}
          />
        </Field>
      ) : (
        <FieldGroup label="Trazado">
          <Segmented value={commonValue(edges.map((edge) => edge.routing))} options={ROUTING_OPTIONS} onChange={(routing) => update(() => ({ routing }))} />
        </FieldGroup>
      )}
      <FieldGroup label="Línea">
        <Segmented
          value={commonValue(edges.map((edge) => edge.lineStyle ?? defaultStyle))}
          options={LINE_OPTIONS}
          onChange={(lineStyle) => update(() => ({ lineStyle: lineStyle === defaultStyle ? null : lineStyle }))}
        />
      </FieldGroup>
    </>
  );
}
