import type { DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { edgeTypeChangePatch } from '@/canvas/applyEdgeType';
import { edgeTypeOptions } from '@/canvas/edgeTypeChoice';
import { inputClass } from './formFields';

/**
 * Selector del tipo de una conexión cuando el módulo admite alternativas
 * (p. ej. asociación → agregación en clases). Al cambiar, aplica también el
 * estereotipo del tipo nuevo si el texto era un estereotipo o estaba vacío.
 */
export function EdgeTypeSelect({
  edgeId,
  artifactType,
  module,
  className = inputClass,
}: {
  edgeId: string;
  artifactType: string;
  module: DiagramModule;
  className?: string;
}) {
  const options = edgeTypeOptions(module, artifactType);
  if (options.length === 0) return null;
  return (
    <select
      aria-label="Tipo de conexión"
      title="Cambiar el tipo de conexión"
      value={artifactType}
      onChange={(event) => {
        const diagram = useDiagramStore.getState().diagram;
        const edge = diagram?.edges.find((item) => item.id === edgeId);
        if (!diagram || !edge) return;
        useDiagramStore.getState().updateEdge(edgeId, edgeTypeChangePatch(module, diagram, edge, event.target.value));
      }}
      className={className}
    >
      {options.map((artifact) => (
        <option key={artifact.type} value={artifact.type}>
          {artifact.name}
        </option>
      ))}
    </select>
  );
}
