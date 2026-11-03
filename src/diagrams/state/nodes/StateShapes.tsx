import { CONTAINER_GRIP_CLASS, type ArtifactNodeProps } from '@/core/registry';
import { centeredLabelClass, SHAPE_FILL, STROKE_WIDTH, strokeFor } from '@/diagrams/shared/shapeStyles';

/** Radio de las esquinas de un estado. */
const STATE_RADIUS = 14;
/** Alto del encabezado (el nombre) de un estado compuesto. */
const HEADER_HEIGHT = 36;

/** Estado simple: rectángulo redondeado con el nombre al centro. */
export function StateShape({ node, selected, label, preview }: ArtifactNodeProps) {
  const radius = Math.min(STATE_RADIUS, node.size.height / 2);
  return (
    <div className="relative size-full" style={{ border: `${STROKE_WIDTH}px solid ${strokeFor(selected)}`, borderRadius: radius, background: SHAPE_FILL }}>
      {!preview && <div className={centeredLabelClass}>{label}</div>}
    </div>
  );
}

/**
 * Estado compuesto: rectángulo redondeado con el nombre arriba, una línea que lo
 * separa y el cuerpo transparente, donde van los subestados. Se agarra por el
 * encabezado y el borde (lo de dentro queda encima).
 */
export function CompositeStateShape({ node, selected, label, preview }: ArtifactNodeProps) {
  const stroke = strokeFor(selected);
  const header = Math.min(HEADER_HEIGHT, node.size.height * 0.25);
  return (
    <div className="flex size-full flex-col overflow-hidden" style={{ border: `${STROKE_WIDTH}px solid ${stroke}`, borderRadius: STATE_RADIUS }}>
      <div
        className={`${CONTAINER_GRIP_CLASS} flex shrink-0 items-center justify-center px-3 text-center text-[13px] font-semibold text-ink-900`}
        style={{ height: header, borderBottom: `${STROKE_WIDTH}px solid ${stroke}`, background: SHAPE_FILL }}
      >
        {!preview && label}
      </div>
    </div>
  );
}

/** Estado inicial: círculo negro relleno. */
export function InitialStateShape({ selected }: ArtifactNodeProps) {
  return (
    <div
      className="size-full rounded-full"
      style={{ background: 'var(--color-shape-stroke)', boxShadow: selected ? '0 0 0 3px var(--color-accent-soft), 0 0 0 1.5px var(--color-accent)' : undefined }}
    />
  );
}

/** Estado final: diana (anillo con un círculo relleno dentro). */
export function FinalStateShape({ selected }: ArtifactNodeProps) {
  const color = strokeFor(selected);
  return (
    <div className="flex size-full items-center justify-center rounded-full" style={{ border: `2px solid ${color}`, background: SHAPE_FILL }}>
      <div className="size-[62%] rounded-full" style={{ background: color }} />
    </div>
  );
}

/** Elección: rombo pequeño. */
export function ChoiceShape({ node, selected }: ArtifactNodeProps) {
  const { width: w, height: h } = node.size;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polygon points={`${w / 2},1 ${w - 1},${h / 2} ${w / 2},${h - 1} 1,${h / 2}`} style={{ fill: SHAPE_FILL, stroke: strokeFor(selected) }} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
    </svg>
  );
}

/** Historia superficial: círculo con una H. */
export function HistoryShape({ node, selected }: ArtifactNodeProps) {
  const color = strokeFor(selected);
  return (
    <div
      className="flex size-full items-center justify-center rounded-full font-semibold text-ink-900"
      style={{ border: `${STROKE_WIDTH}px solid ${color}`, background: SHAPE_FILL, fontSize: Math.max(9, node.size.height * 0.45) }}
    >
      H
    </div>
  );
}
