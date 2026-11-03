import { CONTAINER_GRIP_CLASS, readNumberProperty, type ArtifactNodeProps, type NumberPropertyDefinition } from '@/core/registry';
import { MUTED_STROKE, SHAPE_FILL, STROKE_WIDTH, strokeFor } from '@/diagrams/shared/shapeStyles';
import { FRAGMENT_OPERATOR, SequenceArtifact as S, SPLIT_FRAGMENT_TYPES } from '../artifactTypes';

/** Alto de la cabecera de una línea de vida y de un actor (el monigote necesita más). */
export const LIFELINE_HEAD = 44;
export const ACTOR_HEAD = 72;

/** Ancho de la franja alrededor de la línea discontinua por la que se agarra el participante. */
const LINE_GRIP_WIDTH = 12;

/**
 * Línea de vida: cabecera con el nombre y una línea discontinua hacia abajo.
 * Es un contenedor (dentro van sus activaciones y su destrucción) que solo se
 * agarra por la cabecera y por la línea; el resto deja pasar el ratón.
 */
export function LifelineShape({ node, selected, label }: ArtifactNodeProps) {
  const head = Math.min(LIFELINE_HEAD, node.size.height * 0.3);
  return (
    <div className="relative size-full">
      <div
        className={`${CONTAINER_GRIP_CLASS} absolute inset-x-0 top-0 flex items-center justify-center rounded-md px-2 text-center text-[13px] font-medium text-ink-900`}
        style={{ height: head, border: `${STROKE_WIDTH}px solid ${strokeFor(selected)}`, background: SHAPE_FILL }}
      >
        {label}
      </div>
      <LifeLine top={head} selected={selected} />
    </div>
  );
}

/** Actor: monigote con su nombre debajo, y la misma línea discontinua. */
export function ActorShape({ node, selected, label }: ArtifactNodeProps) {
  const head = Math.min(ACTOR_HEAD, node.size.height * 0.4);
  const stroke = strokeFor(selected);
  const figure = head * 0.62;
  return (
    <div className="relative size-full">
      <div className={`${CONTAINER_GRIP_CLASS} absolute inset-x-0 top-0 flex flex-col items-center`} style={{ height: head }}>
        <svg width={figure * 0.6} height={figure} viewBox="0 0 24 40" className="shrink-0 overflow-visible">
          <circle cx={12} cy={6} r={5} style={{ fill: SHAPE_FILL, stroke }} strokeWidth={STROKE_WIDTH} />
          <path d="M12 11 V26 M2 16 H22 M12 26 L4 39 M12 26 L20 39" style={{ fill: 'none', stroke }} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        </svg>
        <div className="mt-0.5 max-w-full truncate px-1 text-center text-[13px] font-medium text-ink-900">{label}</div>
      </div>
      <LifeLine top={head} selected={selected} />
    </div>
  );
}

/** La línea discontinua del tiempo, con una franja invisible alrededor para agarrarla. */
function LifeLine({ top, selected }: { top: number; selected: boolean }) {
  return (
    <div
      className={`${CONTAINER_GRIP_CLASS} absolute bottom-0 left-1/2 -translate-x-1/2`}
      style={{ top, width: LINE_GRIP_WIDTH }}
    >
      <div
        className="absolute inset-y-0 left-1/2 -translate-x-1/2"
        style={{ borderLeft: `${STROKE_WIDTH}px dashed ${selected ? strokeFor(true) : MUTED_STROKE}` }}
      />
    </div>
  );
}

/** Barra de activación: rectángulo angosto sobre la línea de vida. */
export function ActivationShape({ selected }: ArtifactNodeProps) {
  return <div className="size-full" style={{ border: `${STROKE_WIDTH}px solid ${strokeFor(selected)}`, background: SHAPE_FILL }} />;
}

/** Destrucción: una X. */
export function DestructionShape({ node, selected }: ArtifactNodeProps) {
  const { width: w, height: h } = node.size;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={`M2 2 L${w - 2} ${h - 2} M${w - 2} 2 L2 ${h - 2}`} style={{ fill: 'none', stroke: strokeFor(selected) }} strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

/** Dónde se divide un alt o un par, como porcentaje del alto del marco. */
export const fragmentDivider: NumberPropertyDefinition = {
  kind: 'number',
  key: 'divider',
  label: 'División entre regiones',
  min: 15,
  max: 85,
  defaultValue: 50,
  unit: '%',
};

/** Alto y ancho de la pestaña con el operador (alt, opt…). */
const TAB_HEIGHT = 22;
const TAB_WIDTH = 46;
/** Por debajo de este alto (p. ej. en la miniatura de la paleta) no cabe el texto [else]. */
const MIN_HEIGHT_FOR_ELSE = 80;
/** Grosor de la franja del borde por la que se agarra el marco. */
const EDGE_GRIP = 6;

/**
 * Fragmento combinado: marco con el operador en una pestaña y la guarda debajo.
 * alt y par se dividen en dos regiones con una línea discontinua. Solo se agarra
 * por la pestaña, la guarda y el borde: dentro se pueden tocar los mensajes.
 */
export function FragmentShape({ node, selected, label, preview }: ArtifactNodeProps) {
  const stroke = selected ? strokeFor(true) : MUTED_STROKE;
  const isSplit = SPLIT_FRAGMENT_TYPES.has(node.artifactType);
  const divider = readNumberProperty(node, fragmentDivider);
  const border = `${STROKE_WIDTH}px solid ${stroke}`;
  // En la miniatura la pestaña es proporcional al marco (en el lienzo, de tamaño fijo).
  const tabWidth = preview ? Math.min(TAB_WIDTH, node.size.width * 0.6) : TAB_WIDTH;
  const tabHeight = preview ? Math.min(TAB_HEIGHT, node.size.height * 0.42) : TAB_HEIGHT;
  return (
    <div className="relative size-full rounded-sm" style={{ border }}>
      {(['top', 'bottom'] as const).map((side) => (
        <div key={side} className={`${CONTAINER_GRIP_CLASS} absolute inset-x-0`} style={{ [side]: -EDGE_GRIP / 2, height: EDGE_GRIP }} />
      ))}
      {(['left', 'right'] as const).map((side) => (
        <div key={side} className={`${CONTAINER_GRIP_CLASS} absolute inset-y-0`} style={{ [side]: -EDGE_GRIP / 2, width: EDGE_GRIP }} />
      ))}

      <svg width={tabWidth} height={tabHeight} className={`${CONTAINER_GRIP_CLASS} absolute top-0 left-0 overflow-visible`}>
        <path
          d={`M0 0 H${tabWidth} V${tabHeight * 0.68} L${tabWidth - tabHeight * 0.32} ${tabHeight} H0 Z`}
          style={{ fill: 'var(--color-surface)', stroke }}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
        />
        <text
          x={preview ? 2.5 : 8}
          y={preview ? tabHeight * 0.62 : 15}
          className="font-semibold"
          style={{ fill: 'var(--color-ink-900)', fontSize: preview ? 7.5 : 12 }}
        >
          {FRAGMENT_OPERATOR[node.artifactType]}
        </text>
      </svg>
      <div className={`${CONTAINER_GRIP_CLASS} absolute left-2 max-w-[70%] text-xs text-ink-900`} style={{ top: tabHeight + 4 }}>
        {node.label ? <>[{label}]</> : label}
      </div>

      {isSplit && (
        <div className="absolute inset-x-0" style={{ top: `${divider}%`, borderTop: `${STROKE_WIDTH}px dashed ${stroke}` }}>
          {node.artifactType === S.altFragment && node.size.height >= MIN_HEIGHT_FOR_ELSE && <span className="absolute top-1 left-2 text-xs text-ink-900">[else]</span>}
        </div>
      )}
    </div>
  );
}
