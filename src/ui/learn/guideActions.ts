import { useCallback } from 'react';
import { createDiagramFromTemplate, type DiagramType, type Template } from '@/core/model';
import { useAddArtifactAtCenter } from '@/canvas/placeArtifact';
import { useDiagramStore } from '@/core/store/diagramStore';
import { navigate } from '@/ui/navigation/route';
import { useUiStore } from '@/ui/uiStore';

/** Espera a que el editor vuelva a estar visible y medido antes de tocar el lienzo. */
function afterEditorShows(action: () => void): void {
  window.requestAnimationFrame(() => window.requestAnimationFrame(action));
}

/** Acciones de la guía que llevan al editor: abrir un ejemplo, empezar en blanco o probar un artefacto. */
export function useGuideActions() {
  const addAtCenter = useAddArtifactAtCenter();

  const goToEditor = useCallback(() => {
    useUiStore.getState().setGalleryOpen(false);
    navigate({ page: 'editor' });
  }, []);

  return {
    openTemplate: (template: Template) => {
      useDiagramStore.getState().openDiagram(createDiagramFromTemplate(template));
      goToEditor();
    },
    startBlank: (diagramType: DiagramType) => {
      useDiagramStore.getState().newDiagram({ diagramType, name: 'Diagrama sin título' });
      goToEditor();
    },
    /** Agrega el artefacto al diagrama abierto, en el centro de la vista. */
    tryArtifact: (artifactType: string) => {
      goToEditor();
      afterEditorShows(() => addAtCenter(artifactType));
    },
  };
}
