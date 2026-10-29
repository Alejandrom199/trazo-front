import { useCallback, useEffect } from 'react';
import { useElementClickStore } from '@/canvas/elementClickStore';
import { useActiveModule } from '@/canvas/useActiveModule';
import { useDiagramStore } from '@/core/store/diagramStore';
import { ArtifactPopover } from './ArtifactPopover';

/**
 * Popup de explicación al hacer clic en un nodo o una flecha del lienzo.
 * Se cierra solo si el elemento desaparece (borrado, deshacer) o si el usuario
 * empieza a escribir su texto con doble clic, para no tapar lo que edita.
 */
export function CanvasArtifactPopover() {
  const module = useActiveModule();
  const clicked = useElementClickStore((state) => state.clicked);
  const setClicked = useElementClickStore((state) => state.setClicked);
  const diagram = useDiagramStore((state) => state.diagram);
  const isEditing = useDiagramStore((state) => state.editingNodeId !== null || state.editingEdgeId !== null);
  const close = useCallback(() => setClicked(null), [setClicked]);

  // Al empezar a editar se cierra del todo (no solo se oculta), para que no reaparezca al terminar.
  useEffect(() => {
    if (isEditing) setClicked(null);
  }, [isEditing, setClicked]);

  if (!clicked || !diagram || !module || isEditing) return null;

  const element =
    clicked.kind === 'node'
      ? diagram.nodes.find((node) => node.id === clicked.id)
      : diagram.edges.find((edge) => edge.id === clicked.id);
  const definition = element && module.artifacts.find((artifact) => artifact.type === element.artifactType);
  if (!element || !definition) return null;

  const isNode = clicked.kind === 'node';
  const guard = !isNode && 'guard' in element ? element.guard : null;
  const label = isNode && 'label' in element ? element.label.trim() : '';
  const subtitle = label ? `«${label}»` : guard ? `Guarda: [${guard}]` : undefined;
  const footer = isNode
    ? 'Doble clic para editar su texto. Con el modo aprendizaje, el panel derecho muestra la ficha completa.'
    : 'Doble clic sobre la flecha para escribir su guarda.';

  return (
    <ArtifactPopover
      key={`${clicked.kind}:${clicked.id}`}
      artifact={definition}
      anchor={clicked.rect}
      subtitle={subtitle}
      footer={footer}
      onClose={close}
    />
  );
}
