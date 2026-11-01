import type { ArtifactNodeProps } from '@/core/registry';
import { SHAPE_FILL, STROKE_WIDTH, centeredLabelClass, strokeFor } from '@/diagrams/shared/shapeStyles';

/** Acción: rectángulo de esquinas redondeadas. */
export function ActionShape({ selected, label }: ArtifactNodeProps) {
  return (
    <div
      className="relative size-full rounded-2xl"
      style={{ border: `${STROKE_WIDTH}px solid ${strokeFor(selected)}`, background: SHAPE_FILL }}
    >
      <div className={centeredLabelClass}>{label}</div>
    </div>
  );
}

/** Nodo de objeto: rectángulo de esquinas rectas (lo distingue de la acción). */
export function ObjectNodeShape({ selected, label }: ArtifactNodeProps) {
  return (
    <div
      className="relative size-full rounded-[3px]"
      style={{ border: `${STROKE_WIDTH}px solid ${strokeFor(selected)}`, background: SHAPE_FILL }}
    >
      <div className={centeredLabelClass}>{label}</div>
    </div>
  );
}

/** Profundidad de la punta del pentágono, en píxeles (menor en figuras angostas). */
const TIP = 16;
const tipFor = (width: number) => Math.min(TIP, width * 0.2);

/** Envío de señal: pentágono convexo, la punta sale por la derecha. */
export function SendSignalShape({ selected, node, label }: ArtifactNodeProps) {
  const { width: w, height: h } = node.size;
  const tip = tipFor(w);
  return (
    <div className="relative size-full">
      <svg width={w} height={h} className="absolute inset-0 overflow-visible">
        <polygon
          points={`1,1 ${w - tip},1 ${w - 1},${h / 2} ${w - tip},${h - 1} 1,${h - 1}`}
          style={{ fill: SHAPE_FILL, stroke: strokeFor(selected) }}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
        />
      </svg>
      <div className={centeredLabelClass} style={{ paddingRight: tip }}>
        {label}
      </div>
    </div>
  );
}

/** Aceptación de evento: pentágono cóncavo, la muesca entra por la izquierda. */
export function AcceptEventShape({ selected, node, label }: ArtifactNodeProps) {
  const { width: w, height: h } = node.size;
  const tip = tipFor(w);
  return (
    <div className="relative size-full">
      <svg width={w} height={h} className="absolute inset-0 overflow-visible">
        <polygon
          points={`1,1 ${w - 1},1 ${w - 1},${h - 1} 1,${h - 1} ${tip},${h / 2}`}
          style={{ fill: SHAPE_FILL, stroke: strokeFor(selected) }}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
        />
      </svg>
      <div className={centeredLabelClass} style={{ paddingLeft: tip }}>
        {label}
      </div>
    </div>
  );
}
