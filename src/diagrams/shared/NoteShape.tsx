import type { ArtifactNodeProps } from '@/core/registry';
import { MUTED_STROKE, NOTE_FILL, STROKE_WIDTH, strokeFor } from './shapeStyles';

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
