import { CONTAINER_GRIP_CLASS, readNumberProperty, type ArtifactNodeProps, type NumberPropertyDefinition } from '@/core/registry';
import { STROKE_WIDTH, strokeFor } from './shapeStyles';

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
export function PartitionShape({ node, selected, label }: ArtifactNodeProps) {
  const color = selected ? strokeFor(true) : '#a1a1aa';
  return (
    <div
      className="flex size-full flex-col overflow-hidden"
      style={{ border: `${STROKE_WIDTH}px solid ${color}`, borderRadius: readNumberProperty(node, containerCornerRadius) }}
    >
      <div
        className={`${CONTAINER_GRIP_CLASS} flex h-10 shrink-0 items-center justify-center bg-surface px-3 text-center text-[13px] font-medium text-ink-900`}
        style={{ borderBottom: `${STROKE_WIDTH}px solid ${color}` }}
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
  const stroke = selected ? strokeFor(true) : '#a1a1aa';
  return (
    <div className="relative size-full">
      <svg width={w} height={h} className="absolute inset-0 overflow-visible">
        <path
          d={`M1 1 H${w - FOLD} L${w - 1} ${FOLD} V${h - 1} H1 Z`}
          fill="#fefce8"
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
        />
        <path
          d={`M${w - FOLD} 1 V${FOLD} H${w - 1}`}
          fill="none"
          stroke={stroke}
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
