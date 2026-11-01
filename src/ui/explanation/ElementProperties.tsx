import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { EDGE_OFFSET_KEY, readEdgeOffset, type ArtifactDefinition, type Diagram, type DiagramEdge, type DiagramNode, type EdgePatch, type EdgeRouting, type LineStyle, type NodePatch } from '@/core/model';
import { dashArrayFor } from '@/canvas/edgePath';
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
  const kind = module.edgeKinds[edge.artifactType];
  const isHorizontal = kind?.layout === 'horizontal';
  /** El estilo que le corresponde por su tipo (p. ej. el anclaje de nota es discontinuo). */
  const defaultStyle: LineStyle = kind?.dashed ? 'dashed' : 'solid';
  const update = (patch: EdgePatch) => useDiagramStore.getState().updateEdge(edge.id, patch);
  const alternatives = (kind?.switchableTo ?? [])
    .map((type) => module.artifacts.find((artifact) => artifact.type === type))
    .filter((artifact): artifact is ArtifactDefinition => artifact !== undefined);

  return (
    <div className="space-y-4">
      <Field label="Tipo" hint={alternatives.length > 0 ? 'Cambia el tipo sin volver a dibujarla' : undefined}>
        {alternatives.length > 0 ? (
          <select
            value={edge.artifactType}
            // Al cambiar de tipo, el estilo de línea vuelve al del tipo nuevo.
            onChange={(event) => update({ artifactType: event.target.value, lineStyle: null })}
            className={inputClass}
          >
            {[definition, ...alternatives.filter((artifact) => artifact.type !== definition.type)].map((artifact) => (
              <option key={artifact.type} value={artifact.type}>
                {artifact.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-ink-900">{definition.name}</p>
        )}
      </Field>
      <Field label="Conecta">
        <p className="text-sm text-ink-900">
          «{nameOf(edge.sourceId)}» → «{nameOf(edge.targetId)}»
        </p>
      </Field>
      {kind?.text === 'guard' && (
        <Field label={kind.textCaption ?? 'Guarda'} hint="Condición para tomar este camino, sin corchetes">
          <TextInput
            value={edge.guard ?? ''}
            placeholder="p. ej. pago aprobado"
            onCommit={(guard) => useDiagramStore.getState().setEdgeGuard(edge.id, guard === '' ? null : guard)}
          />
        </Field>
      )}
      {kind?.text === 'label' && (
        <Field label={kind.textCaption ?? 'Texto'}>
          <TextInput value={edge.label} placeholder="p. ej. validar(usuario)" onCommit={(label) => update({ label })} />
        </Field>
      )}

      {isHorizontal ? (
        <Field label="Altura" hint="Desde el borde superior del origen. También se arrastra con el punto de su extremo.">
          <NumberInput
            prefix="Y"
            value={readEdgeOffset(edge)}
            min={0}
            onCommit={(offset) => update({ props: { ...edge.props, [EDGE_OFFSET_KEY]: offset } })}
          />
        </Field>
      ) : (
      <FieldGroup label="Trazado" hint="Selecciona la flecha y arrastra los puntos ○ para agregar vértices; doble clic en un vértice ● lo quita.">
        <Segmented
          value={edge.routing}
          options={ROUTING_OPTIONS}
          onChange={(routing) => update({ routing })}
        />
        {edge.waypoints.length > 0 && (
          <button
            type="button"
            onClick={() => update({ waypoints: [] })}
            className="mt-2 text-xs font-medium text-accent hover:underline"
          >
            Quitar {edge.waypoints.length === 1 ? 'el vértice' : `los ${edge.waypoints.length} vértices`}
          </button>
        )}
      </FieldGroup>
      )}

      <FieldGroup
        label="Línea"
        hint={
          edge.lineStyle && edge.lineStyle !== defaultStyle
            ? `En UML este tipo se dibuja con línea ${defaultStyle === 'dashed' ? 'discontinua' : 'continua'}: cambiarla puede confundir a quien lo lea.`
            : undefined
        }
      >
        <Segmented
          value={edge.lineStyle ?? defaultStyle}
          options={LINE_OPTIONS}
          onChange={(lineStyle) => update({ lineStyle: lineStyle === defaultStyle ? null : lineStyle })}
        />
      </FieldGroup>
    </div>
  );
}

const ROUTING_OPTIONS: { value: EdgeRouting; label: string; icon: ReactNode }[] = [
  { value: 'orthogonal', label: 'Ortogonal', icon: <RoutingIcon d="M3 15 V8 H15 V3" /> },
  { value: 'straight', label: 'Recta', icon: <RoutingIcon d="M3 15 L9 5 L15 12" /> },
  { value: 'curved', label: 'Curva', icon: <RoutingIcon d="M3 15 C5 3, 13 3, 15 12" /> },
];

const LINE_OPTIONS: { value: LineStyle; label: string; icon: ReactNode }[] = [
  { value: 'solid', label: 'Continua', icon: <LineIcon /> },
  { value: 'dashed', label: 'Discontinua', icon: <LineIcon dash={dashArrayFor('dashed')} /> },
  { value: 'dotted', label: 'Punteada', icon: <LineIcon dash={dashArrayFor('dotted')} round /> },
];

function RoutingIcon({ d }: { d: string }) {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LineIcon({ dash, round = false }: { dash?: string; round?: boolean }) {
  return (
    <svg width={22} height={18} viewBox="0 0 22 18" aria-hidden>
      <line x1={2} y1={9} x2={20} y2={9} stroke="currentColor" strokeWidth={2} strokeDasharray={dash} strokeLinecap={round ? 'round' : 'butt'} />
    </svg>
  );
}

/** Grupo de botones excluyentes (como pestañas pequeñas). */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-lg bg-canvas p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[11px] transition-colors ${
            value === option.value ? 'bg-surface font-medium text-accent shadow-sm' : 'text-ink-600 hover:text-ink-900'
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Como Field, pero sin <label>: para grupos de botones (una etiqueta activaría el primero). */
function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] leading-relaxed text-ink-400">{hint}</span>}
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
