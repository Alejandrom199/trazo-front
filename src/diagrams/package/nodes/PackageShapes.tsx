import { CONTAINER_GRIP_CLASS, type ArtifactNodeProps } from '@/core/registry';
import { centeredLabelClass, SHAPE_FILL, STROKE_WIDTH, strokeFor } from '@/diagrams/shared/shapeStyles';

/** Alto de la pestaña del paquete; el cuerpo empieza justo debajo. */
export const PACKAGE_TAB = 24;

/**
 * Paquete: carpeta con su nombre en la pestaña. Se agarra por todo su cuerpo: lo
 * de dentro y sus flechas quedan encima. En la miniatura la pestaña es
 * proporcional para que se reconozca la carpeta.
 */
export function PackageShape({ node, selected, label, preview }: ArtifactNodeProps) {
  const stroke = strokeFor(selected);
  const tabHeight = preview ? Math.round(node.size.height * 0.28) : PACKAGE_TAB;
  return (
    <div className="relative size-full">
      <div
        className={`${CONTAINER_GRIP_CLASS} absolute top-0 left-0 max-w-[75%] ${preview ? 'w-[40%]' : 'min-w-[40%]'} truncate border border-b-0 px-2.5 text-[12px] leading-[22px] font-semibold text-ink-900`}
        style={{ height: tabHeight, borderColor: stroke, borderWidth: STROKE_WIDTH, background: SHAPE_FILL }}
      >
        {!preview && label}
      </div>
      <div
        className={`${CONTAINER_GRIP_CLASS} absolute inset-x-0 bottom-0`}
        style={{ top: tabHeight - STROKE_WIDTH, border: `${STROKE_WIDTH}px solid ${stroke}`, background: 'color-mix(in oklch, var(--color-shape-fill) 35%, transparent)' }}
      />
    </div>
  );
}

/** Elemento del paquete (clase o interfaz): rectángulo con su nombre. */
export function ElementShape({ selected, label, preview }: ArtifactNodeProps) {
  return (
    <div className="relative size-full" style={{ border: `${STROKE_WIDTH}px solid ${strokeFor(selected)}`, background: SHAPE_FILL }}>
      {!preview && <div className={`${centeredLabelClass} font-medium`}>{label}</div>}
    </div>
  );
}
