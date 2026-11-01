import { useState, type KeyboardEvent, type ReactNode } from 'react';
import type { ArtifactDefinition, Diagram, DiagramEdge, DiagramNode, NodePatch } from '@/core/model';
import { readNumberProperty, type DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';

/**
 * Propiedades editables del elemento clicado en el lienzo. Cada campo confirma al
 * pulsar Enter o al salir de él, y cada confirmación es un paso de deshacer.
 */

const MIN_SIZE = 6;

export function NodeProperties({ node, diagram, module }: { node: DiagramNode; diagram: Diagram; module: DiagramModule }) {
  const kind = module.nodeKinds[node.artifactType];
  const lane = node.parentId ? diagram.nodes.find((candidate) => candidate.id === node.parentId) : undefined;
  const update = (patch: NodePatch) => useDiagramStore.getState().updateNode(node.id, patch);
  const lockedHint = node.locked ? 'Desbloquéalo con el candado del encabezado para cambiarlo' : undefined;

  return (
    <div className="space-y-4">
      {kind?.hasLabel && (
        <Field label={kind.labelCaption ?? 'Nombre'}>
          <TextInput value={node.label} onCommit={(label) => update({ label })} />
        </Field>
      )}

      <Field label={lane ? `Posición (dentro de «${lane.label || 'carril'}»)` : 'Posición'} hint={lockedHint}>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput prefix="X" value={node.position.x} disabled={node.locked} onCommit={(x) => update({ position: { ...node.position, x } })} />
          <NumberInput prefix="Y" value={node.position.y} disabled={node.locked} onCommit={(y) => update({ position: { ...node.position, y } })} />
        </div>
      </Field>

      {kind?.resizable && (
        <Field label="Tamaño" hint={lockedHint}>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput prefix="An" value={node.size.width} min={MIN_SIZE} disabled={node.locked} onCommit={(width) => update({ size: { ...node.size, width } })} />
            <NumberInput prefix="Al" value={node.size.height} min={MIN_SIZE} disabled={node.locked} onCommit={(height) => update({ size: { ...node.size, height } })} />
          </div>
        </Field>
      )}

      {kind?.properties.map((property) => (
        <Field key={property.key} label={property.label} hint={`Entre ${property.min} y ${property.max}${property.unit ?? ''}`}>
          <NumberInput
            prefix={property.unit ?? ''}
            value={readNumberProperty(node, property)}
            min={property.min}
            max={property.max}
            onCommit={(value) => update({ props: { ...node.props, [property.key]: value } })}
          />
        </Field>
      ))}

      <Field label="Notas">
        <TextInput value={node.notes} multiline placeholder="Comentario para ti o tu equipo" onCommit={(notes) => update({ notes })} />
      </Field>
    </div>
  );
}

export function EdgeProperties({
  edge,
  diagram,
  module,
  definition,
}: {
  edge: DiagramEdge;
  diagram: Diagram;
  module: DiagramModule;
  definition: ArtifactDefinition;
}) {
  const nameOf = (id: string) => diagram.nodes.find((node) => node.id === id)?.label.trim() || 'nodo sin nombre';
  const hasGuard = module.edgeKinds[edge.artifactType]?.hasGuard ?? false;

  return (
    <div className="space-y-4">
      <Field label="Tipo">
        <p className="text-sm text-ink-900">{definition.name}</p>
      </Field>
      <Field label="Conecta">
        <p className="text-sm text-ink-900">
          «{nameOf(edge.sourceId)}» → «{nameOf(edge.targetId)}»
        </p>
      </Field>
      {hasGuard && (
        <Field label="Guarda" hint="Condición para tomar este camino, sin corchetes">
          <TextInput
            value={edge.guard ?? ''}
            placeholder="p. ej. pago aprobado"
            onCommit={(guard) => useDiagramStore.getState().setEdgeGuard(edge.id, guard === '' ? null : guard)}
          />
        </Field>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-400">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-accent/50 focus:ring-2 focus:ring-accent/15 disabled:bg-canvas disabled:text-ink-400';

/** Enter confirma (en multilínea, Mayús+Enter salta de línea); Escape descarta lo escrito. */
function useDraft<T>(value: T, onCommit: (value: T) => void, equals: (a: T, b: T) => boolean = Object.is) {
  const [draft, setDraft] = useState<{ base: T; text: T } | null>(null);
  // El borrador solo vale mientras el valor externo no cambie (p. ej. al deshacer).
  const current = draft && equals(draft.base, value) ? draft.text : value;
  return {
    current,
    change: (text: T) => setDraft({ base: value, text }),
    commit: () => {
      if (draft && !equals(draft.text, value)) onCommit(draft.text);
      setDraft(null);
    },
    discard: () => setDraft(null),
  };
}

function TextInput({
  value,
  multiline = false,
  placeholder,
  onCommit,
}: {
  value: string;
  multiline?: boolean;
  placeholder?: string;
  onCommit: (value: string) => void;
}) {
  const draft = useDraft(value, (text) => onCommit(text.trim()));
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      draft.discard();
    }
    if (event.key === 'Enter' && !(multiline && event.shiftKey)) {
      event.preventDefault();
      draft.commit();
    }
  };
  const shared = {
    value: draft.current,
    placeholder,
    onChange: (event: { target: { value: string } }) => draft.change(event.target.value),
    onBlur: draft.commit,
    onKeyDown,
    className: inputClass,
  };
  return multiline ? <textarea rows={3} {...shared} className={`${inputClass} resize-none`} /> : <input {...shared} />;
}

function NumberInput({
  prefix,
  value,
  min = -Infinity,
  max = Infinity,
  disabled,
  onCommit,
}: {
  prefix: string;
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onCommit: (value: number) => void;
}) {
  const shown = String(Math.round(value));
  const draft = useDraft(shown, (text) => {
    const parsed = Number(text);
    if (text.trim() === '' || !Number.isFinite(parsed)) return;
    onCommit(Math.min(max, Math.max(min, parsed)));
  });
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[11px] font-medium text-ink-400">{prefix}</span>
      <input
        type="number"
        inputMode="numeric"
        disabled={disabled}
        value={draft.current}
        onChange={(event) => draft.change(event.target.value)}
        onBlur={draft.commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') draft.commit();
          if (event.key === 'Escape') {
            event.stopPropagation();
            draft.discard();
          }
        }}
        className={`${inputClass} pl-8 tabular-nums`}
      />
    </div>
  );
}
