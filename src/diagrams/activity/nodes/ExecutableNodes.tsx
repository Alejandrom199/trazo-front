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

/**
 * Acción de subproceso (CallBehaviorAction): una acción con el tridente ⋔ abajo a
 * la derecha, que indica que su detalle está en otro diagrama. En miniatura
 * (paleta, Aprender) no hay texto: el tridente va centrado y a escala de la figura.
 */
export function CallBehaviorShape({ selected, label, preview }: ArtifactNodeProps) {
  const stroke = strokeFor(selected);
  return (
    <div className="relative size-full rounded-2xl" style={{ border: `${STROKE_WIDTH}px solid ${stroke}`, background: SHAPE_FILL }}>
      {preview ? (
        <RakeIcon stroke={stroke} className="absolute inset-0 m-auto" style={{ height: '55%', aspectRatio: '16 / 14' }} />
      ) : (
        <>
          <div className={centeredLabelClass} style={{ paddingBottom: 12 }}>{label}</div>
          <RakeIcon stroke={stroke} className="absolute right-2.5 bottom-2 size-4" />
        </>
      )}
    </div>
  );
}

/** Tridente ⋔ de UML: un mango que se abre en tres púas. El trazo no cambia de grosor al escalar. */
function RakeIcon({ stroke, className, style }: { stroke: string; className: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 14" className={className} style={style} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1v12M2 13V7h12v6" vectorEffect="non-scaling-stroke" />
    </svg>
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
