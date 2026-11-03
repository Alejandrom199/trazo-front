import { CONTAINER_GRIP_CLASS, type ArtifactNodeProps } from '@/core/registry';
import { SHAPE_FILL, STROKE_WIDTH, strokeFor } from '@/diagrams/shared/shapeStyles';

export function UseCaseShape({ selected, label }: ArtifactNodeProps) {
  return (
    <div
      className="flex size-full items-center justify-center rounded-[50%] px-4 text-center text-[13px] leading-snug text-ink-900"
      style={{ border: `${STROKE_WIDTH}px solid ${strokeFor(selected)}`, background: SHAPE_FILL }}
    >
      {label}
    </div>
  );
}

export function ActorShape({ node, selected, label }: ArtifactNodeProps) {
  const stroke = strokeFor(selected);
  // El monigote ocupa lo que deja el nombre y se escala con el nodo (también en su miniatura).
  const figureHeight = Math.max(16, node.size.height - (node.size.height > 60 ? 28 : 0));
  return (
    <div className="flex size-full flex-col items-center justify-start">
      <svg height={figureHeight} viewBox="0 0 48 76" className="w-full max-w-12 shrink-0 overflow-visible">
        <circle cx={24} cy={10} r={8} style={{ fill: SHAPE_FILL, stroke }} strokeWidth={STROKE_WIDTH} />
        <path d="M24 18 V48 M7 29 H41 M24 48 L10 72 M24 48 L38 72" style={{ fill: 'none', stroke }} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      </svg>
      <div className="max-w-full text-center text-[13px] font-medium leading-snug text-ink-900">{label}</div>
    </div>
  );
}

export function SystemBoundaryShape({ selected, label }: ArtifactNodeProps) {
  return (
    <div
      className="relative size-full"
      style={{ border: `${STROKE_WIDTH}px solid ${strokeFor(selected)}`, background: 'color-mix(in oklch, var(--color-shape-fill) 35%, transparent)' }}
    >
      <div className={`${CONTAINER_GRIP_CLASS} absolute inset-x-0 top-0 flex h-9 items-center px-3 text-[13px] font-semibold text-ink-900`}>
        {label}
      </div>
    </div>
  );
}
