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
  /** Medidas del marco, en píxeles (se ignoran sin marco). */
  borderWidth: number;
  borderRadius: number;
  /** Espacio entre el borde y el diagrama. */
  padding: number;
}

/** Clase que apaga las animaciones mientras se captura (ver index.css). */
const EXPORTING_CLASS = 'trazo-exporting';

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
 * rectángulo que ocupan los nodos y las flechas. Etapas: limpiar selección y resaltados →
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
      root.classList.add(EXPORTING_CLASS);
      try {
        await nextFrames(2);
        const colors = themeColors();
        const bounds = withEdges(getNodesBounds(nodes), viewportElement);
        // Con marco, el aire alrededor del diagrama es el espacio interior que eligió el usuario.
        const margin = options.frame === 'none' ? MARGIN : options.padding;
        const width = Math.ceil(bounds.width + margin * 2);
        const height = Math.ceil(bounds.height + margin * 2);
        const capture = {
          // Con marco, el fondo lo pone el marco (redondeado); la captura va sin fondo para no asomar por las esquinas.
          backgroundColor: options.background === 'transparent' || options.frame !== 'none' ? undefined : colors.background,
          width,
          height,
          pixelRatio: PIXEL_RATIO,
          style: {
            width: `${width}px`,
            height: `${height}px`,
            transform: `translate(${margin - bounds.x}px, ${margin - bounds.y}px) scale(1)`,
          },
          filter: isExportable,
        };
        const image = options.format === 'png' ? await toPng(viewportElement, capture) : await toSvg(viewportElement, capture);
        if (options.frame === 'none') return image;
        const frame = frameLayout(width, height, options);
        return options.format === 'png' ? framePng(image, frame, colors) : frameSvg(image, frame, colors);
      } finally {
        root.classList.remove(EXPORTING_CLASS);
        if (previousTheme) root.dataset.theme = previousTheme;
        else delete root.dataset.theme;
      }
    },
    [getNodes, getNodesBounds],
  );
}

type Bounds = { x: number; y: number; width: number; height: number };

/**
 * Amplía el recuadro de los nodos con lo que dibujan las flechas: un vértice o un
 * texto puede quedar fuera de todos los nodos (p. ej. una flecha que rodea el
 * diagrama) y, sin esto, la imagen la cortaba. Mide en pantalla y lo pasa a
 * coordenadas del diagrama con la posición y el zoom del viewport.
 */
function withEdges(bounds: Bounds, viewportElement: HTMLElement): Bounds {
  const origin = viewportElement.getBoundingClientRect();
  const zoom = new DOMMatrixReadOnly(getComputedStyle(viewportElement).transform).a || 1;
  let left = bounds.x;
  let top = bounds.y;
  let right = bounds.x + bounds.width;
  let bottom = bounds.y + bounds.height;
  for (const element of viewportElement.querySelectorAll('.react-flow__edge-path, .trazo-edge-label')) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    left = Math.min(left, (rect.left - origin.left) / zoom);
    top = Math.min(top, (rect.top - origin.top) / zoom);
    right = Math.max(right, (rect.right - origin.left) / zoom);
    bottom = Math.max(bottom, (rect.bottom - origin.top) / zoom);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

interface ThemeColors {
  background: string;
  border: string;
  text: string;
}

function themeColors(): ThemeColors {
  const read = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  return { background: read('--color-board', 'white'), border: read('--color-shape-muted', '#888'), text: read('--color-ink-900', '#111') };
}

/** Medidas del marco, en puntos (sin la densidad del PNG). */
interface FrameLayout {
  width: number;
  height: number;
  /** Rectángulo del borde (por el centro del trazo). */
  border: { x: number; y: number; width: number; height: number; radius: number; strokeWidth: number };
  /** Dónde va el diagrama dentro de la imagen enmarcada. */
  image: { x: number; y: number; width: number; height: number };
  title: { text: string; x: number; y: number } | null;
  transparent: boolean;
}

const TITLE_HEIGHT = 44;
/** Aire mínimo entre el borde y el límite de la imagen, para que el trazo no se corte. */
const OUTER_GAP = 2;

export function frameLayout(width: number, height: number, options: ImageExportOptions): FrameLayout {
  const strokeWidth = Math.max(0, options.borderWidth);
  const outer = strokeWidth / 2 + OUTER_GAP;
  const header = options.frame === 'titled' ? TITLE_HEIGHT : 0;
  const total = { width: width + outer * 2, height: height + outer * 2 + header };
  return {
    ...total,
    border: { x: outer, y: outer, width: total.width - outer * 2, height: total.height - outer * 2, radius: Math.max(0, options.borderRadius), strokeWidth },
    image: { x: outer, y: outer + header, width, height },
    title: options.frame === 'titled' ? { text: options.title.trim() || 'Diagrama', x: outer + Math.max(options.padding, 16), y: outer + header / 2 + 4 } : null,
    transparent: options.background === 'transparent',
  };
}

/** PNG enmarcado: se dibuja la captura sobre un lienzo con fondo, borde y título. */
async function framePng(dataUrl: string, frame: FrameLayout, colors: ThemeColors): Promise<string> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(frame.width * PIXEL_RATIO);
  canvas.height = Math.ceil(frame.height * PIXEL_RATIO);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no permite dibujar la imagen.');
  context.scale(PIXEL_RATIO, PIXEL_RATIO);

  const { border } = frame;
  context.beginPath();
  context.roundRect(border.x, border.y, border.width, border.height, border.radius);
  if (!frame.transparent) {
    context.fillStyle = colors.background;
    context.fill();
  }
  context.drawImage(image, frame.image.x, frame.image.y, frame.image.width, frame.image.height);
  if (border.strokeWidth > 0) {
    context.lineWidth = border.strokeWidth;
    context.strokeStyle = colors.border;
    context.stroke();
  }
  if (frame.title) {
    context.fillStyle = colors.text;
    context.font = '600 16px Inter, system-ui, sans-serif';
    context.textBaseline = 'middle';
    context.fillText(frame.title.text, frame.title.x, frame.title.y);
  }
  return canvas.toDataURL('image/png');
}

/** SVG enmarcado: el SVG capturado va como imagen dentro de otro con fondo, borde y título. */
function frameSvg(dataUrl: string, frame: FrameLayout, colors: ThemeColors): string {
  const { border } = frame;
  const box = `x="${border.x}" y="${border.y}" width="${border.width}" height="${border.height}" rx="${border.radius}"`;
  const background = frame.transparent ? '' : `<rect ${box} fill="${colors.background}"/>`;
  const stroke = border.strokeWidth > 0 ? `<rect ${box} fill="none" stroke="${colors.border}" stroke-width="${border.strokeWidth}"/>` : '';
  const title = frame.title
    ? `<text x="${frame.title.x}" y="${frame.title.y}" dominant-baseline="middle" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="600" fill="${colors.text}">${escapeXml(frame.title.text)}</text>`
    : '';
  const { x, y, width, height } = frame.image;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}" viewBox="0 0 ${frame.width} ${frame.height}">${background}<image x="${x}" y="${y}" width="${width}" height="${height}" href="${escapeXml(dataUrl)}"/>${stroke}${title}</svg>`;
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
