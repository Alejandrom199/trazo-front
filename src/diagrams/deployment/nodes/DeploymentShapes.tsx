import { CONTAINER_GRIP_CLASS, type ArtifactNodeProps } from '@/core/registry';
import { SHAPE_FILL, STROKE_WIDTH, strokeFor } from '@/diagrams/shared/shapeStyles';

/** Profundidad del cubo (las caras de arriba y derecha). */
const DEPTH = 12;

/**
 * Cubo en perspectiva de UML para nodos, dispositivos y entornos de ejecución:
 * la cara frontal es el contenedor; arriba a la izquierda, el estereotipo y el
 * nombre. Se agarra por todo su cuerpo (lo de dentro queda encima).
 */
function Cube({ node, selected, label, preview, stereotype, subtle = false }: ArtifactNodeProps & { stereotype: string; subtle?: boolean }) {
  const stroke = strokeFor(selected);
  const { width: w, height: h } = node.size;
  const depth = Math.min(DEPTH, w * 0.12, h * 0.12);
  const face = subtle ? 'color-mix(in oklch, var(--color-shape-fill) 60%, transparent)' : SHAPE_FILL;
  return (
    <div className={`${CONTAINER_GRIP_CLASS} relative size-full`}>
      <svg width={w} height={h} className="absolute inset-0 overflow-visible" aria-hidden>
        <path
          d={`M0 ${depth} L${depth} 0 H${w} V${h - depth} L${w - depth} ${h} M${w - depth} ${depth} L${w} 0`}
          style={{ fill: 'none', stroke }}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
        />
        <path d={`M0 ${depth} L${depth} 0 H${w} L${w - depth} ${depth} Z`} style={{ fill: 'color-mix(in oklch, var(--color-shape-fill) 50%, transparent)', stroke }} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
        <path d={`M${w - depth} ${depth} L${w} 0 V${h - depth} L${w - depth} ${h} Z`} style={{ fill: 'color-mix(in oklch, var(--color-shape-fill) 50%, transparent)', stroke }} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
        <rect x={0} y={depth} width={w - depth} height={h - depth} style={{ fill: face, stroke }} strokeWidth={STROKE_WIDTH} />
      </svg>
      {!preview && (
        <div className="absolute left-3 text-[13px] leading-tight text-ink-900" style={{ top: depth + 8, right: depth + 8 }}>
          <span className="block text-[10px] text-ink-600">«{stereotype}»</span>
          <span className="block truncate font-semibold">{label}</span>
        </div>
      )}
    </div>
  );
}

export const NodeShape = (props: ArtifactNodeProps) => <Cube {...props} stereotype="node" />;
export const DeviceShape = (props: ArtifactNodeProps) => <Cube {...props} stereotype="device" />;
export const ExecutionEnvironmentShape = (props: ArtifactNodeProps) => <Cube {...props} stereotype="executionEnvironment" subtle />;

/** Icono de documento con la esquina doblada (el de los artefactos de UML). */
function DocumentGlyph({ stroke, size }: { stroke: string; size: number }) {
  return (
    <svg width={size * 0.8} height={size} viewBox="0 0 16 20" className="shrink-0" aria-hidden>
      <path d="M1 1 H11 L15 5 V19 H1 Z M11 1 V5 H15" style={{ fill: SHAPE_FILL, stroke }} strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  );
}

/** Artefacto: rectángulo con su nombre de archivo y el icono de documento. */
export function ArtifactShape({ node, selected, label, preview }: ArtifactNodeProps) {
  const stroke = strokeFor(selected);
  const glyph = Math.min(18, node.size.height * 0.45);
  return (
    <div className="relative flex size-full items-center justify-center px-3" style={{ border: `${STROKE_WIDTH}px solid ${stroke}`, background: SHAPE_FILL }}>
      <span className="absolute" style={{ top: preview ? 3 : 6, right: preview ? 3 : 7 }}>
        <DocumentGlyph stroke={stroke} size={glyph} />
      </span>
      {!preview && (
        <div className="text-center text-[13px] leading-snug text-ink-900">
          <span className="block text-[10px] text-ink-600">«artifact»</span>
          <span className="font-semibold">{label}</span>
        </div>
      )}
    </div>
  );
}
