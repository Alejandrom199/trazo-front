import type { ArtifactNodeProps } from '@/core/registry';
import { centeredLabelClass, SHAPE_FILL, STROKE_WIDTH, strokeFor } from '@/diagrams/shared/shapeStyles';

/**
 * Figuras del MER en notación de Chen. Lo «débil» o «identificador» se dibuja
 * con borde doble; la clave va subrayada; el multivaluado, con óvalo doble; el
 * derivado, con borde discontinuo. En miniatura (preview) no llevan texto.
 */

const INSET = 4;

/** Entidad: rectángulo. Débil: rectángulo doble. */
function EntityFigure({ selected, label, preview, double }: ArtifactNodeProps & { double: boolean }) {
  const border = `${STROKE_WIDTH}px solid ${strokeFor(selected)}`;
  return (
    <div className="relative size-full" style={{ border, background: SHAPE_FILL }}>
      {double && <div className="pointer-events-none absolute" style={{ inset: INSET - STROKE_WIDTH, border }} />}
      {!preview && <div className={`${centeredLabelClass} font-semibold`}>{label}</div>}
    </div>
  );
}

export const EntityShape = (props: ArtifactNodeProps) => <EntityFigure {...props} double={false} />;
export const WeakEntityShape = (props: ArtifactNodeProps) => <EntityFigure {...props} double />;

/** Relación: rombo. Identificadora: rombo doble. */
function RelationshipFigure({ node, selected, label, preview, double }: ArtifactNodeProps & { double: boolean }) {
  const { width: w, height: h } = node.size;
  const stroke = strokeFor(selected);
  const diamond = (inset: number) => `${w / 2},${inset} ${w - inset},${h / 2} ${w / 2},${h - inset} ${inset},${h / 2}`;
  return (
    <div className="relative size-full">
      <svg width={w} height={h} className="absolute inset-0 overflow-visible" aria-hidden>
        <polygon points={diamond(1)} style={{ fill: SHAPE_FILL, stroke }} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
        {double && <polygon points={diamond(INSET * 2)} style={{ fill: 'none', stroke }} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />}
      </svg>
      {!preview && <div className={`${centeredLabelClass} px-[22%] text-xs`}>{label}</div>}
    </div>
  );
}

export const RelationshipShape = (props: ArtifactNodeProps) => <RelationshipFigure {...props} double={false} />;
export const IdentifyingRelationshipShape = (props: ArtifactNodeProps) => <RelationshipFigure {...props} double />;

type AttributeStyle = 'simple' | 'key' | 'multivalued' | 'derived';

/** Atributo: óvalo. Clave: texto subrayado. Multivaluado: óvalo doble. Derivado: borde discontinuo. */
function AttributeFigure({ selected, label, preview, style }: ArtifactNodeProps & { style: AttributeStyle }) {
  const border = `${STROKE_WIDTH}px ${style === 'derived' ? 'dashed' : 'solid'} ${strokeFor(selected)}`;
  return (
    <div className="relative size-full rounded-[50%]" style={{ border, background: SHAPE_FILL }}>
      {style === 'multivalued' && <div className="pointer-events-none absolute rounded-[50%]" style={{ inset: INSET - STROKE_WIDTH, border }} />}
      {preview && style === 'key' && <div className="absolute inset-x-[30%] top-1/2 border-t" style={{ borderColor: strokeFor(selected) }} />}
      {!preview && <div className={`${centeredLabelClass} px-4 text-xs ${style === 'key' ? 'underline underline-offset-2' : ''}`}>{label}</div>}
    </div>
  );
}

export const AttributeShape = (props: ArtifactNodeProps) => <AttributeFigure {...props} style="simple" />;
export const KeyAttributeShape = (props: ArtifactNodeProps) => <AttributeFigure {...props} style="key" />;
export const MultivaluedAttributeShape = (props: ArtifactNodeProps) => <AttributeFigure {...props} style="multivalued" />;
export const DerivedAttributeShape = (props: ArtifactNodeProps) => <AttributeFigure {...props} style="derived" />;
