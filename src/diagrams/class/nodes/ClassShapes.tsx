import { CONTAINER_GRIP_CLASS, type ArtifactNodeProps } from '@/core/registry';
import { SHAPE_FILL, STROKE_WIDTH, strokeFor } from '@/diagrams/shared/shapeStyles';

function compartments(text: string): string[][] {
  return text.split(/\n-{2,}\n/).map((part) => part.split('\n').filter(Boolean));
}

function Classifier({ node, selected, editing, label, preview, stereotype, abstract = false }: ArtifactNodeProps & { stereotype?: string; abstract?: boolean }) {
  if (preview) return <ClassifierIcon selected={selected} stereotype={stereotype} abstract={abstract} />;
  const parts = compartments(node.label);
  if (editing) return <div className="flex size-full items-center overflow-hidden px-2 text-[12px] text-ink-900" style={{ border: `${STROKE_WIDTH}px solid ${strokeFor(selected)}`, background: SHAPE_FILL }}>{label}</div>;
  return <div className="flex size-full flex-col overflow-hidden text-[12px] text-ink-900" style={{ border: `${STROKE_WIDTH}px solid ${strokeFor(selected)}`, background: SHAPE_FILL }}>
    <div className={`${CONTAINER_GRIP_CLASS} flex min-h-12 flex-col items-center justify-center px-2 py-1.5 text-center`}>
      {stereotype && <span className="text-[10px] text-ink-600">«{stereotype}»</span>}
      <span className={`font-semibold ${abstract ? 'italic' : ''}`}>{parts[0]?.[0] ?? node.label}</span>
    </div>
    {parts.length > 1 && <div className="min-h-9 border-t border-shape-stroke/60 px-2 py-1.5 whitespace-pre-wrap">{parts[1]?.join('\n')}</div>}
    {parts.length > 2 && <div className="min-h-9 flex-1 border-t border-shape-stroke/60 px-2 py-1.5 whitespace-pre-wrap">{parts[2]?.join('\n')}</div>}
  </div>;
}

/**
 * Miniatura de un clasificador: la caja con sus compartimentos y rayas en lugar de
 * texto. Se distinguen por un símbolo: la abstracta lleva el nombre discontinuo
 * (evoca la cursiva), la interfaz el circulito de UML y la enumeración una lista.
 */
function ClassifierIcon({ selected, stereotype, abstract }: { selected: boolean; stereotype?: string; abstract: boolean }) {
  const stroke = strokeFor(selected);
  const bar = (width: string, dashed = false) => (
    <span className="block h-0 rounded-full" style={{ width, borderTop: `1.5px ${dashed ? 'dashed' : 'solid'} ${stroke}`, opacity: 0.5 }} />
  );
  const isEnum = stereotype === 'enumeration';
  return (
    <div className="relative flex size-full flex-col overflow-hidden" style={{ border: `${STROKE_WIDTH}px solid ${stroke}`, background: SHAPE_FILL }}>
      <div className="flex flex-[1.2] items-center justify-center">{bar('45%', abstract)}</div>
      <div className="flex flex-1 flex-col justify-center gap-[3px] border-t px-[12%]" style={{ borderColor: stroke }}>
        {isEnum ? (
          <>
            <span className="flex items-center gap-[3px]"><span className="size-[3px] rounded-full" style={{ background: stroke }} />{bar('60%')}</span>
            <span className="flex items-center gap-[3px]"><span className="size-[3px] rounded-full" style={{ background: stroke }} />{bar('45%')}</span>
          </>
        ) : (
          bar('70%')
        )}
      </div>
      {!isEnum && <div className="flex flex-1 items-center border-t px-[12%]" style={{ borderColor: stroke }}>{bar('55%')}</div>}
      {stereotype === 'interface' && (
        <span className="absolute top-[3px] right-[3px] size-[7px] rounded-full" style={{ border: `1.5px solid ${stroke}`, background: SHAPE_FILL }} />
      )}
    </div>
  );
}

export const ClassShape = (props: ArtifactNodeProps) => <Classifier {...props} />;
export const AbstractClassShape = (props: ArtifactNodeProps) => <Classifier {...props} abstract />;
export const InterfaceShape = (props: ArtifactNodeProps) => <Classifier {...props} stereotype="interface" />;
export const EnumerationShape = (props: ArtifactNodeProps) => <Classifier {...props} stereotype="enumeration" />;

/** Alto de la pestaña del paquete; el cuerpo empieza justo debajo (no se sale del nodo). */
const PACKAGE_TAB = 22;

/**
 * Paquete: carpeta con pestaña (proporcional, para que también quepa en su miniatura).
 * Se agarra por todo su cuerpo: las clases de dentro y sus flechas quedan encima.
 */
export function PackageShape({ node, selected, label, preview }: ArtifactNodeProps) {
  const stroke = strokeFor(selected);
  // En la miniatura la pestaña es proporcional: con su alto fijo apenas quedaba cuerpo.
  const tabHeight = preview ? Math.round(node.size.height * 0.28) : PACKAGE_TAB;
  const tab = { height: tabHeight, borderColor: stroke, background: SHAPE_FILL, borderWidth: STROKE_WIDTH };
  return (
    <div className="relative size-full">
      <div className={`${CONTAINER_GRIP_CLASS} absolute top-0 left-0 max-w-[70%] ${preview ? 'w-[40%]' : 'min-w-[35%]'} truncate border border-b-0 px-2 text-[11px] font-semibold leading-5 text-ink-900`} style={tab}>
        {label}
      </div>
      <div
        className={`${CONTAINER_GRIP_CLASS} absolute inset-x-0 bottom-0`}
        style={{ top: tabHeight - STROKE_WIDTH, border: `${STROKE_WIDTH}px solid ${stroke}`, background: 'color-mix(in oklch, var(--color-shape-fill) 35%, transparent)' }}
      />
    </div>
  );
}
