import { absolutePosition, nodeName, EDGE_OFFSET_KEY, LABEL_OFFSET_KEY, readEdgeOffset, readLabelOffset, type Diagram, type DiagramEdge, type DiagramNode, type EdgePatch, type NodePatch } from '@/core/model';
import { readNumberProperty, readSelectProperty, readTextProperty, type DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { canReverseEdge, reverseEdge } from '@/canvas/edgeActions';
import { Field, FieldGroup, inputClass, NumberInput, ROUTING_OPTIONS, Segmented, TextInput } from './formFields';

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

      {kind?.properties.map((property) => {
        if (property.kind === 'text') {
          return (
            <Field key={property.key} label={property.label} hint={property.hint}>
              <TextInput
                value={readTextProperty(node, property)}
                placeholder={property.placeholder}
                onCommit={(value) => update({ props: { ...node.props, [property.key]: value } })}
              />
            </Field>
          );
        }
        if (property.kind === 'select') {
          return (
            <Field key={property.key} label={property.label} hint={property.hint}>
              <select
                value={readSelectProperty(node, property)}
                onChange={(event) => update({ props: { ...node.props, [property.key]: event.target.value } })}
                className={inputClass}
              >
                {property.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          );
        }
        return (
          <Field key={property.key} label={property.label} hint={`Entre ${property.min} y ${property.max}${property.unit ?? ''}`}>
            <NumberInput
              prefix={property.unit ?? ''}
              value={readNumberProperty(node, property)}
              min={property.min}
              max={property.max}
              onCommit={(value) => update({ props: { ...node.props, [property.key]: value } })}
            />
          </Field>
        );
      })}

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
}: {
  edge: DiagramEdge;
  diagram: Diagram;
  module: DiagramModule;
}) {
  const nameOf = (id: string) => nodeName(diagram.nodes.find((node) => node.id === id), 'nodo sin nombre');
  const kind = module.edgeKinds[edge.artifactType];
  const isHorizontal = kind?.layout === 'horizontal';
  const labelOffset = readLabelOffset(edge);
  const update = (patch: EdgePatch) => useDiagramStore.getState().updateEdge(edge.id, patch);

  return (
    <div className="space-y-4">
      <Field label="Conecta">
        <p className="text-sm text-ink-900">
          «{nameOf(edge.sourceId)}» → «{nameOf(edge.targetId)}»
        </p>
      </Field>
      {kind?.sourceMarker && edge.sourceId !== edge.targetId && (
        // El rombo marca el todo y va siempre en el origen: elegir dónde va invierte la flecha.
        <Field label="Rombo en" hint="La clase que es el todo: la que contiene a la otra.">
          <Segmented
            value={edge.sourceId}
            options={[edge.sourceId, edge.targetId].map((id) => ({
              value: id,
              label: `«${nameOf(id)}» ${placeOf(diagram, id, id === edge.sourceId ? edge.targetId : edge.sourceId)}`,
              disabled: id !== edge.sourceId && !canReverseEdge(module, diagram, edge),
            }))}
            onChange={(id) => id !== edge.sourceId && reverseEdge(module, edge.id)}
          />
        </Field>
      )}
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
      <FieldGroup label="Trazado" hint="Con la flecha seleccionada, arrastra la línea desde cualquier punto para crear un vértice (o clic derecho → Agregar vértice). Doble clic en un vértice ● lo quita.">
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
    </div>
  );
}

/**
 * Dónde está un nodo respecto de otro (arriba, abajo, a la izquierda, a la derecha),
 * por sus centros. Distingue dos extremos con el mismo nombre, p. ej. «Clase» y «Clase».
 */
function placeOf(diagram: Diagram, nodeId: string, otherId: string): string {
  const center = (id: string) => {
    const node = diagram.nodes.find((candidate) => candidate.id === id);
    if (!node) return { x: 0, y: 0 };
    const origin = absolutePosition(diagram, node);
    return { x: origin.x + node.size.width / 2, y: origin.y + node.size.height / 2 };
  };
  const a = center(nodeId);
  const b = center(otherId);
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  if (Math.abs(dy) >= Math.abs(dx)) return dy < 0 ? '(arriba)' : '(abajo)';
  return dx < 0 ? '(izquierda)' : '(derecha)';
}
