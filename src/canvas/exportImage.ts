import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useHighlightStore } from './highlightStore';

export type ImageFormat = 'png' | 'svg';
/** Fondo de la imagen: claro u oscuro (con los colores de ese tema) o transparente (colores del tema claro). */
export type ImageBackground = 'light' | 'dark' | 'transparent';
/** Marco alrededor del diagrama: ninguno, un borde redondeado, o borde con el nombre del diagrama. */
export type ImageFrame = 'none' | 'border' | 'titled';

export interface ImageExportOptions {
  format: ImageFormat;
  background: ImageBackground;
  frame: ImageFrame;
  /** Texto del encabezado con el marco «titled». */
  title: string;
}

/** Margen alrededor del diagrama en la imagen. */
const MARGIN = 40;
/** Píxeles por punto en el PNG: nítido en pantallas de alta densidad. */
const PIXEL_RATIO = 2;

/**
 * Lo que no debe salir en la imagen: elementos de edición y lo marcado con
 * data-export-ignore (p. ej. los candados de los nodos bloqueados).
 */
const EDITING_CHROME = ['react-flow__handle', 'react-flow__resize-control', 'react-flow__resize-line'];
const isExportable = (element: HTMLElement) =>
  !EDITING_CHROME.some((name) => element.classList?.contains(name)) && element.dataset?.exportIgnore === undefined;

/**
 * Exporta TODO el diagrama (no solo lo visible) como PNG o SVG, recortado al
 * rectángulo que ocupan los nodos. Etapas: limpiar selección y resaltados →
 * poner el tema del fondo elegido → capturar → restaurar el tema → enmarcar.
 * Devuelve la imagen como data URL; descargarla es cosa de quien llama.
 */
export function useDiagramImageExport() {
  const { getNodes, getNodesBounds } = useReactFlow();

  return useCallback(
    async (options: ImageExportOptions): Promise<string> => {
      const nodes = getNodes();
      const viewportElement = document.querySelector<HTMLElement>('.react-flow__viewport');
      if (nodes.length === 0 || !viewportElement) throw new Error('El diagrama está vacío.');

      useDiagramStore.getState().setSelection({ nodeIds: [], edgeIds: [] });
      useHighlightStore.getState().setHighlight(null);

      const root = document.documentElement;
      const previousTheme = root.dataset.theme;
      root.dataset.theme = options.background === 'dark' ? 'dark' : 'light';
      try {
        await nextFrames(2);
        const colors = themeColors();
        const bounds = getNodesBounds(nodes);
        const width = Math.ceil(bounds.width + MARGIN * 2);
        const height = Math.ceil(bounds.height + MARGIN * 2);
        const capture = {
          backgroundColor: options.background === 'transparent' ? undefined : colors.background,
          width,
          height,
          pixelRatio: PIXEL_RATIO,
          style: {
            width: `${width}px`,
            height: `${height}px`,
            transform: `translate(${MARGIN - bounds.x}px, ${MARGIN - bounds.y}px) scale(1)`,
          },
          filter: isExportable,
        };
        const image = options.format === 'png' ? await toPng(viewportElement, capture) : await toSvg(viewportElement, capture);
        if (options.frame === 'none') return image;
        const frame = frameLayout(width, height, options);
        return options.format === 'png' ? framePng(image, frame, colors) : frameSvg(image, frame, colors);
      } finally {
        if (previousTheme) root.dataset.theme = previousTheme;
        else delete root.dataset.theme;
      }
    },
    [getNodes, getNodesBounds],
  );
}

interface ThemeColors {
  background: string;
  border: string;
  text: string;
}

function themeColors(): ThemeColors {
  const read = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  return { background: read('--color-canvas', 'white'), border: read('--color-shape-muted', '#888'), text: read('--color-ink-900', '#111') };
}

/** Medidas del marco, en puntos (sin la densidad del PNG). */
interface FrameLayout {
  width: number;
  height: number;
  /** Dónde va el diagrama dentro de la imagen enmarcada. */
  image: { x: number; y: number; width: number; height: number };
  title: string | null;
  transparent: boolean;
}

const FRAME_INSET = 12;
const FRAME_RADIUS = 14;
const TITLE_HEIGHT = 44;

function frameLayout(width: number, height: number, options: ImageExportOptions): FrameLayout {
  const title = options.frame === 'titled' ? options.title.trim() || 'Diagrama' : null;
  const header = title ? TITLE_HEIGHT : 0;
  return {
    width: width + FRAME_INSET * 2,
    height: height + FRAME_INSET * 2 + header,
    image: { x: FRAME_INSET, y: FRAME_INSET + header, width, height },
    title,
    transparent: options.background === 'transparent',
  };
}

/** PNG enmarcado: se dibuja la captura sobre un lienzo con fondo, borde y título. */
async function framePng(dataUrl: string, frame: FrameLayout, colors: ThemeColors): Promise<string> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = frame.width * PIXEL_RATIO;
  canvas.height = frame.height * PIXEL_RATIO;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no permite dibujar la imagen.');
  context.scale(PIXEL_RATIO, PIXEL_RATIO);

  const half = FRAME_INSET / 2;
  context.beginPath();
  context.roundRect(half, half, frame.width - FRAME_INSET, frame.height - FRAME_INSET, FRAME_RADIUS);
  if (!frame.transparent) {
    context.fillStyle = colors.background;
    context.fill();
  }
  context.lineWidth = 1.5;
  context.strokeStyle = colors.border;
  context.stroke();
  if (frame.title) {
    context.fillStyle = colors.text;
    context.font = '600 16px Inter, system-ui, sans-serif';
    context.textBaseline = 'middle';
    context.fillText(frame.title, FRAME_INSET + 16, FRAME_INSET + TITLE_HEIGHT / 2 + 2);
  }
  context.drawImage(image, frame.image.x, frame.image.y, frame.image.width, frame.image.height);
  return canvas.toDataURL('image/png');
}

/** SVG enmarcado: el SVG capturado va como imagen dentro de otro con fondo, borde y título. */
function frameSvg(dataUrl: string, frame: FrameLayout, colors: ThemeColors): string {
  const half = FRAME_INSET / 2;
  const rect = `<rect x="${half}" y="${half}" width="${frame.width - FRAME_INSET}" height="${frame.height - FRAME_INSET}" rx="${FRAME_RADIUS}" fill="${frame.transparent ? 'none' : colors.background}" stroke="${colors.border}" stroke-width="1.5"/>`;
  const title = frame.title
    ? `<text x="${FRAME_INSET + 16}" y="${FRAME_INSET + TITLE_HEIGHT / 2 + 2}" dominant-baseline="middle" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="600" fill="${colors.text}">${escapeXml(frame.title)}</text>`
    : '';
  const { x, y, width, height } = frame.image;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}" viewBox="0 0 ${frame.width} ${frame.height}">${rect}${title}<image x="${x}" y="${y}" width="${width}" height="${height}" href="${escapeXml(dataUrl)}"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo preparar la imagen.'));
    image.src = src;
  });
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function nextFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (remaining: number) =>
      remaining === 0 ? resolve() : window.requestAnimationFrame(() => step(remaining - 1));
    step(count);
  });
}
