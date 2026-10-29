import type { ArtifactNodeProps } from '@/core/registry';
import { STROKE_WIDTH, centeredLabelClass, strokeFor } from './shapeStyles';

/** Acción: rectángulo de esquinas redondeadas. */
export function ActionShape({ selected, label }: ArtifactNodeProps) {
  return (
    <div
      className="relative size-full rounded-2xl bg-surface"
      style={{ border: `${STROKE_WIDTH}px solid ${strokeFor(selected)}` }}
    >
      <div className={centeredLabelClass}>{label}</div>
    </div>
  );
}

/** Nodo de objeto: rectángulo de esquinas rectas (lo distingue de la acción). */
export function ObjectNodeShape({ selected, label }: ArtifactNodeProps) {
  return (
    <div
      className="relative size-full rounded-[3px] bg-surface"
      style={{ border: `${STROKE_WIDTH}px solid ${strokeFor(selected)}` }}
    >
      <div className={centeredLabelClass}>{label}</div>
    </div>
  );
}

/** Profundidad de la punta del pentágono, en píxeles. */
const TIP = 16;

/** Envío de señal: pentágono convexo, la punta sale por la derecha. */
export function SendSignalShape({ selected, node, label }: ArtifactNodeProps) {
  const { width: w, height: h } = node.size;
  return (
    <div className="relative size-full">
      <svg width={w} height={h} className="absolute inset-0 overflow-visible">
        <polygon
          points={`1,1 ${w - TIP},1 ${w - 1},${h / 2} ${w - TIP},${h - 1} 1,${h - 1}`}
          fill="white"
          stroke={strokeFor(selected)}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
        />
      </svg>
      <div className={centeredLabelClass} style={{ paddingRight: TIP }}>
        {label}
      </div>
    </div>
  );
}

/** Aceptación de evento: pentágono cóncavo, la muesca entra por la izquierda. */
export function AcceptEventShape({ selected, node, label }: ArtifactNodeProps) {
  const { width: w, height: h } = node.size;
  return (
    <div className="relative size-full">
      <svg width={w} height={h} className="absolute inset-0 overflow-visible">
        <polygon
          points={`1,1 ${w - 1},1 ${w - 1},${h - 1} 1,${h - 1} ${TIP},${h / 2}`}
          fill="white"
          stroke={strokeFor(selected)}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
        />
      </svg>
      <div className={centeredLabelClass} style={{ paddingLeft: TIP }}>
        {label}
      </div>
    </div>
  );
}
