import type { ArtifactNodeProps } from '@/core/registry';
import { STROKE_WIDTH, strokeFor } from './shapeStyles';

/** Círculo negro relleno. */
export function InitialNodeShape({ selected }: ArtifactNodeProps) {
  return (
    <div
      className="size-full rounded-full bg-ink-900"
      style={{ boxShadow: selected ? `0 0 0 3px ${strokeFor(true)}33` : undefined }}
    />
  );
}

/** Diana: anillo exterior con un círculo relleno dentro. */
export function ActivityFinalShape({ selected }: ArtifactNodeProps) {
  const color = strokeFor(selected);
  return (
    <div className="flex size-full items-center justify-center rounded-full bg-surface" style={{ border: `2px solid ${color}` }}>
      <div className="size-[62%] rounded-full" style={{ background: color }} />
    </div>
  );
}

/** Círculo con una X. */
export function FlowFinalShape({ selected, node }: ArtifactNodeProps) {
  const { width, height } = node.size;
  const color = strokeFor(selected);
  const inset = width * 0.15;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <circle cx={width / 2} cy={height / 2} r={width / 2 - 1} fill="white" stroke={color} strokeWidth={STROKE_WIDTH} />
      <path
        d={`M${inset} ${inset} L${width - inset} ${height - inset} M${width - inset} ${inset} L${inset} ${height - inset}`}
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Rombo; lo usan tanto la decisión como la fusión (UML los dibuja igual). */
export function DiamondShape({ selected, node }: ArtifactNodeProps) {
  const { width, height } = node.size;
  const half = { x: width / 2, y: height / 2 };
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polygon
        points={`${half.x},1 ${width - 1},${half.y} ${half.x},${height - 1} 1,${half.y}`}
        fill="white"
        stroke={strokeFor(selected)}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Barra gruesa; la usan fork y join. Su orientación sale del tamaño. */
export function BarShape({ selected }: ArtifactNodeProps) {
  return <div className="size-full rounded-full" style={{ background: strokeFor(selected) }} />;
}
