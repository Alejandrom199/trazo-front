import { CONTAINER_GRIP_CLASS, type ArtifactNodeProps } from '@/core/registry';
import { SHAPE_FILL, STROKE_WIDTH, strokeFor } from '@/diagrams/shared/shapeStyles';

function compartments(text: string): string[][] {
  return text.split(/\n-{2,}\n/).map((part) => part.split('\n').filter(Boolean));
}

function Classifier({ node, selected, editing, label, stereotype, abstract = false }: ArtifactNodeProps & { stereotype?: string; abstract?: boolean }) {
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

export const ClassShape = (props: ArtifactNodeProps) => <Classifier {...props} />;
export const AbstractClassShape = (props: ArtifactNodeProps) => <Classifier {...props} abstract />;
export const InterfaceShape = (props: ArtifactNodeProps) => <Classifier {...props} stereotype="interface" />;
export const EnumerationShape = (props: ArtifactNodeProps) => <Classifier {...props} stereotype="enumeration" />;

export function PackageShape({ selected, label }: ArtifactNodeProps) {
  const stroke = strokeFor(selected);
  return <div className="relative size-full pt-5"><div className={`${CONTAINER_GRIP_CLASS} absolute top-0 left-0 h-6 min-w-24 border px-2 text-[11px] font-semibold leading-5 text-ink-900`} style={{ borderColor: stroke, background: SHAPE_FILL }}>{label}</div><div className="size-full" style={{ border: `${STROKE_WIDTH}px solid ${stroke}`, background: 'color-mix(in oklch, var(--color-shape-fill) 35%, transparent)' }} /></div>;
}
