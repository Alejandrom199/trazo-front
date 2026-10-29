import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useHighlightStore } from './highlightStore';

export type ImageFormat = 'png' | 'svg';

/** Margen blanco alrededor del diagrama en la imagen. */
const MARGIN = 40;

/** Elementos de edición que no deben salir en la imagen. */
const EDITING_CHROME = ['react-flow__handle', 'react-flow__resize-control', 'react-flow__resize-line'];

/**
 * Exporta TODO el diagrama (no solo lo visible) como PNG o SVG.
 * Se recorta al rectángulo que ocupan los nodos, a escala 1, y antes se quitan
 * selección y resaltados para que la imagen salga limpia.
 * Devuelve la imagen como data URL; descargarla es cosa de quien llama.
 */
export function useDiagramImageExport() {
  const { getNodes, getNodesBounds } = useReactFlow();

  return useCallback(
    async (format: ImageFormat): Promise<string> => {
      const nodes = getNodes();
      const viewportElement = document.querySelector<HTMLElement>('.react-flow__viewport');
      if (nodes.length === 0 || !viewportElement) throw new Error('El diagrama está vacío.');

      useDiagramStore.getState().setSelection({ nodeIds: [], edgeIds: [] });
      useHighlightStore.getState().setHighlight(null);
      await nextFrames(2);

      const bounds = getNodesBounds(nodes);
      const width = Math.ceil(bounds.width + MARGIN * 2);
      const height = Math.ceil(bounds.height + MARGIN * 2);
      const options = {
        backgroundColor: '#ffffff',
        width,
        height,
        pixelRatio: 2,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${MARGIN - bounds.x}px, ${MARGIN - bounds.y}px) scale(1)`,
        },
        filter: (element: HTMLElement) => !EDITING_CHROME.some((name) => element.classList?.contains(name)),
      };
      return format === 'png' ? toPng(viewportElement, options) : toSvg(viewportElement, options);
    },
    [getNodes, getNodesBounds],
  );
}

function nextFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (remaining: number) =>
      remaining === 0 ? resolve() : window.requestAnimationFrame(() => step(remaining - 1));
    step(count);
  });
}
