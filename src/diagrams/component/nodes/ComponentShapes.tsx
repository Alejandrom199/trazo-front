import { CONTAINER_GRIP_CLASS, type ArtifactNodeProps } from '@/core/registry';
import { SHAPE_FILL, STROKE_WIDTH, strokeFor } from '@/diagrams/shared/shapeStyles';

/** Icono de componente de UML: una caja con dos pestañas en el lado izquierdo. */
function ComponentGlyph({ stroke, size }: { stroke: string; size: number }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 20 16" className="shrink-0" aria-hidden>
      <rect x={4} y={1} width={15} height={14} rx={1} style={{ fill: SHAPE_FILL, stroke }} strokeWidth={1.4} />
      <rect x={1} y={3.5} width={6} height={3} style={{ fill: SHAPE_FILL, stroke }} strokeWidth={1.4} />
      <rect x={1} y={9.5} width={6} height={3} style={{ fill: SHAPE_FILL, stroke }} strokeWidth={1.4} />
    </svg>
  );
}

/** Componente: rectángulo con su nombre y el icono de componente en la esquina. */
export function ComponentShape({ node, selected, label, preview }: ArtifactNodeProps) {
  const stroke = strokeFor(selected);
  const glyph = Math.min(20, node.size.width * 0.32, node.size.height * 0.45);
  return (
    <div className="relative flex size-full items-center justify-center rounded-[3px] px-3" style={{ border: `${STROKE_WIDTH}px solid ${stroke}`, background: SHAPE_FILL }}>
      <span className="absolute" style={{ top: preview ? 3 : 7, right: preview ? 3 : 8 }}>
        <ComponentGlyph stroke={stroke} size={glyph} />
      </span>
      {!preview && (
        <div className="text-center text-[13px] leading-snug text-ink-900">
          <span className="block text-[10px] text-ink-600">«component»</span>
          <span className="font-semibold">{label}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Interfaz provista o requerida: solo el símbolo (piruleta o enchufe) es el nodo,
 * para que las líneas lleguen a él; el nombre va debajo, fuera del nodo.
 */
function InterfaceShape({ selected, label, preview, required }: ArtifactNodeProps & { required: boolean }) {
  const stroke = strokeFor(selected);
  return (
    <div className="relative size-full">
      <svg viewBox="0 0 28 28" className="size-full overflow-visible" aria-hidden>
        {required ? (
          <path d="M9 3 A11 11 0 0 1 9 25" style={{ fill: 'none', stroke }} strokeWidth={2} strokeLinecap="round" />
        ) : (
          <circle cx={14} cy={14} r={10} style={{ fill: SHAPE_FILL, stroke }} strokeWidth={2} />
        )}
      </svg>
      {!preview && label && (
        <div className="absolute top-full left-1/2 mt-1 -translate-x-1/2 text-center text-xs whitespace-nowrap text-ink-900">{label}</div>
      )}
    </div>
  );
}

export const ProvidedInterfaceShape = (props: ArtifactNodeProps) => <InterfaceShape {...props} required={false} />;
export const RequiredInterfaceShape = (props: ArtifactNodeProps) => <InterfaceShape {...props} required />;

/** Subsistema: contenedor de componentes; se agarra por todo su cuerpo (lo de dentro queda encima). */
export function SubsystemShape({ selected, label, preview }: ArtifactNodeProps) {
  const stroke = strokeFor(selected);
  return (
    <div
      className={`${CONTAINER_GRIP_CLASS} relative size-full rounded-[4px]`}
      style={{ border: `${STROKE_WIDTH}px solid ${stroke}`, background: 'color-mix(in oklch, var(--color-shape-fill) 35%, transparent)' }}
    >
      <div className="flex items-center gap-2 px-3 pt-2">
        <ComponentGlyph stroke={stroke} size={preview ? 10 : 16} />
        {!preview && (
          <span className="text-[13px] text-ink-900">
            <span className="text-[10px] text-ink-600">«subsystem» </span>
            <span className="font-semibold">{label}</span>
          </span>
        )}
      </div>
    </div>
  );
}
