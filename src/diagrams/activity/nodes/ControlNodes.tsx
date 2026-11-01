import type { ArtifactNodeProps } from '@/core/registry';
import { SHAPE_FILL, STROKE_WIDTH, strokeFor } from './shapeStyles';

/** Círculo negro relleno. */
export function InitialNodeShape({ selected }: ArtifactNodeProps) {
  return (
    <div
      className="size-full rounded-full"
      style={{
        background: 'var(--color-shape-stroke)',
        boxShadow: selected ? '0 0 0 3px var(--color-accent-soft), 0 0 0 1.5px var(--color-accent)' : undefined,
      }}
    />
  );
}

/** Diana: anillo exterior con un círculo relleno dentro. */
export function ActivityFinalShape({ selected }: ArtifactNodeProps) {
  const color = strokeFor(selected);
  return (
    <div className="flex size-full items-center justify-center rounded-full" style={{ border: `2px solid ${color}`, background: SHAPE_FILL }}>
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
      <circle cx={width / 2} cy={height / 2} r={width / 2 - 1} style={{ fill: SHAPE_FILL, stroke: color }} strokeWidth={STROKE_WIDTH} />
      <path
        d={`M${inset} ${inset} L${width - inset} ${height - inset} M${width - inset} ${inset} L${inset} ${height - inset}`}
        style={{ stroke: color }}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Rombo; lo usan tanto la decisión como la fusión (UML los dibuja igual).
 * Si hay texto (la pregunta de una decisión) va arriba a la derecha, fuera del
 * rombo: así el rombo conserva su tamaño y las flechas no lo atraviesan.
 */
export function DiamondShape({ selected, node, label }: ArtifactNodeProps) {
  const { width, height } = node.size;
  const half = { x: width / 2, y: height / 2 };
  return (
    <div className="relative size-full">
      <svg width={width} height={height} className="overflow-visible">
        <polygon
          points={`${half.x},1 ${width - 1},${half.y} ${half.x},${height - 1} 1,${half.y}`}
          style={{ fill: SHAPE_FILL, stroke: strokeFor(selected) }}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
        />
      </svg>
      {label && (
        <div
          className="absolute bottom-[78%] left-[78%] w-max max-w-56 text-[12px] leading-snug font-medium text-ink-900"
          style={{ textAlign: 'left' }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

/** Barra gruesa; la usan fork y join. Su orientación sale del tamaño. */
export function BarShape({ selected }: ArtifactNodeProps) {
  return <div className="size-full rounded-full" style={{ background: strokeFor(selected) }} />;
}
