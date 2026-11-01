import { absolutePosition, type Diagram } from '@/core/model';
import type { DiagramModule } from '@/core/registry';
import type { Rect } from '@/canvas/edgeGeometry';
import { drawOrder } from '@/canvas/adapters';
import { connectionPath } from '@/canvas/connectionPath';
import { dashArrayFor } from '@/canvas/edgePath';

interface TemplatePreviewProps {
  diagram: Diagram;
  module: DiagramModule;
  width: number;
  height: number;
}

const PADDING = 12;

/**
 * Miniatura estática de un diagrama: dibuja los mismos componentes del lienzo
 * y las mismas flechas, escalados para caber en la tarjeta. No usa React Flow.
 */
export function TemplatePreview({ diagram, module, width, height }: TemplatePreviewProps) {
  const rects = new Map<string, Rect>(
    diagram.nodes.map((node) => [node.id, { ...absolutePosition(diagram, node), ...node.size }]),
  );
  const all = [...rects.values()];
  if (all.length === 0) return <div style={{ width, height }} />;

  const minX = Math.min(...all.map((rect) => rect.x));
  const minY = Math.min(...all.map((rect) => rect.y));
  const contentWidth = Math.max(...all.map((rect) => rect.x + rect.width)) - minX;
  const contentHeight = Math.max(...all.map((rect) => rect.y + rect.height)) - minY;
  const scale = Math.min((width - PADDING * 2) / contentWidth, (height - PADDING * 2) / contentHeight, 1);
  const offsetX = (width - contentWidth * scale) / 2;
  const offsetY = (height - contentHeight * scale) / 2;

  // Mismo orden de dibujo que el lienzo.
  const nodes = [...diagram.nodes].sort((a, b) => drawOrder(a, module) - drawOrder(b, module));

  return (
    <div className="pointer-events-none relative overflow-hidden" style={{ width, height }} aria-hidden>
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale}) translate(${-minX}px, ${-minY}px)` }}
      >
        {nodes.map((node) => {
          const kind = module.nodeKinds[node.artifactType];
          const rect = rects.get(node.id);
          if (!kind || !rect) return null;
          const Shape = kind.component;
          return (
            <div key={node.id} className="absolute" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}>
              <Shape node={node} selected={false} label={kind.hasLabel ? node.label : null} />
            </div>
          );
        })}
        <svg className="absolute top-0 left-0 overflow-visible" width={1} height={1}>
          {diagram.edges.map((edge) => {
            const source = rects.get(edge.sourceId);
            const target = rects.get(edge.targetId);
            if (!source || !target) return null;
            const { d } = connectionPath(diagram, module, edge, source, target);
            const style = edge.lineStyle ?? (module.edgeKinds[edge.artifactType]?.dashed ? 'dashed' : 'solid');
            return <path key={edge.id} d={d} style={{ fill: 'none', stroke: 'var(--color-edge)' }} strokeWidth={1.5} strokeDasharray={dashArrayFor(style)} />;
          })}
        </svg>
      </div>
    </div>
  );
}
