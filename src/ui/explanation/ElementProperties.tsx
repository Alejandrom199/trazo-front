import { EDGE_OFFSET_KEY, LABEL_OFFSET_KEY, readEdgeOffset, readLabelOffset, type ArtifactDefinition, type Diagram, type DiagramEdge, type DiagramNode, type EdgePatch, type LineStyle, type NodePatch } from '@/core/model';
import { readNumberProperty, type DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { Field, FieldGroup, inputClass, LINE_OPTIONS, NumberInput, ROUTING_OPTIONS, Segmented, TextInput } from './formFields';

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
  const labelOffset = readLabelOffset(edge);
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
      {(labelOffset.x !== 0 || labelOffset.y !== 0) && (
        <button
          type="button"
          onClick={() => {
            const { [LABEL_OFFSET_KEY]: _moved, ...props } = edge.props;
            update({ props });
          }}
          className="text-xs font-medium text-accent hover:underline"
        >
          Devolver el texto a su sitio
        </button>
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
