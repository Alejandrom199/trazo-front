import { NO_JOINTS } from '@/core/model';
import { CONTAINER_GRIP_CLASS, readNumberProperty, type ArtifactNodeProps, type NumberPropertyDefinition } from '@/core/registry';
import { MUTED_STROKE, NOTE_FILL, STROKE_WIDTH, strokeFor } from './shapeStyles';

/** Alto del encabezado de un carril de tamaño normal. */
const HEADER_HEIGHT = 40;

/** Radio de las esquinas del carril, configurable en sus propiedades. */
export const containerCornerRadius: NumberPropertyDefinition = {
  kind: 'number',
  key: 'cornerRadius',
  label: 'Radio de las esquinas',
  min: 0,
  max: 48,
  defaultValue: 12,
  unit: 'px',
};

/**
 * Carril vertical: encabezado con el responsable y cuerpo donde caen los nodos.
 * El cuerpo es transparente para que las flechas que lo cruzan se sigan viendo.
 */
export function PartitionShape({ node, selected, label, joints = NO_JOINTS }: ArtifactNodeProps) {
  const color = selected ? strokeFor(true) : MUTED_STROKE;
  // Proporcionales al tamaño para que un carril pequeño (o su miniatura) siga pareciendo un carril.
  const headerHeight = Math.min(HEADER_HEIGHT, node.size.height * 0.25);
  const radius = Math.min(readNumberProperty(node, containerCornerRadius), node.size.width / 4);
  // Donde llega un carril vecino, esa esquina queda recta. Un lado cubierto de punta a
  // punta por vecinos no dibuja borde (ya lo dibuja el vecino); si solo se tocan en un
  // tramo, cada carril conserva el suyo.
  const { coveredSides, squareCorners } = joints;
  const corner = (square: boolean) => (square ? 0 : radius);
  const border = `${STROKE_WIDTH}px solid ${color}`;
  return (
    <div
      className="flex size-full flex-col overflow-hidden"
      style={{
        borderTop: coveredSides.top ? 'none' : border,
        borderLeft: coveredSides.left ? 'none' : border,
        borderRight: border,
        borderBottom: border,
        borderRadius: `${corner(squareCorners.topLeft)}px ${corner(squareCorners.topRight)}px ${corner(squareCorners.bottomRight)}px ${corner(squareCorners.bottomLeft)}px`,
      }}
    >
      <div
        className={`${CONTAINER_GRIP_CLASS} flex shrink-0 items-center justify-center bg-surface px-3 text-center text-[13px] font-medium text-ink-900`}
        style={{ height: headerHeight, borderBottom: `${STROKE_WIDTH}px solid ${color}` }}
      >
        {label}
      </div>
    </div>
  );
}

/** Tamaño de la esquina doblada de la nota. */
const FOLD = 14;

/** Nota: rectángulo con la esquina superior derecha doblada. */
export function NoteShape({ selected, node, label }: ArtifactNodeProps) {
  const { width: w, height: h } = node.size;
  const stroke = selected ? strokeFor(true) : MUTED_STROKE;
  const fold = Math.min(FOLD, w * 0.25, h * 0.35);
  return (
    <div className="relative size-full">
      <svg width={w} height={h} className="absolute inset-0 overflow-visible">
        <path
          d={`M1 1 H${w - fold} L${w - 1} ${fold} V${h - 1} H1 Z`}
          style={{ fill: NOTE_FILL, stroke }}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
        />
        <path
          d={`M${w - fold} 1 V${fold} H${w - 1}`}
          style={{ fill: 'none', stroke }}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
        />
      </svg>
      <div className="absolute inset-0 overflow-hidden px-3 py-2.5 pr-5 text-xs leading-relaxed text-ink-600">
        {label}
      </div>
    </div>
  );
}
