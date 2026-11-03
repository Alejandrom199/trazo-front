import type { EdgeKind } from '@/core/registry';

/**
 * Figura de un conector fuera del lienzo (paleta, Aprender, selección): una línea
 * con el trazo, la punta y el rombo de su tipo, igual que en el lienzo, para
 * distinguir de un vistazo una composición de una agregación o una realización.
 */
export function EdgeFigure({ kind, box }: { kind: EdgeKind | undefined; box: { width: number; height: number } }) {
  const { width: w, height: h } = box;
  const y = h / 2;
  const start = 3;
  const end = w - 3;
  const head = Math.min(9, w / 4);
  const diamond = kind?.sourceMarker ? Math.min(12, w / 3) : 0;
  const lineEnd = kind?.arrow === 'filled' || kind?.arrow === 'hollow' ? end - head : end;
  const ink = { stroke: 'var(--color-edge)' };

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0 overflow-visible">
      <line
        x1={start + diamond}
        y1={y}
        x2={lineEnd}
        y2={y}
        strokeWidth={1.5}
        strokeDasharray={kind?.dashed ? '4 3' : undefined}
        style={ink}
      />
      {kind?.sourceMarker && (
        <path
          d={`M${start} ${y} l${diamond / 2} ${-diamond / 3} l${diamond / 2} ${diamond / 3} l${-diamond / 2} ${diamond / 3} Z`}
          strokeWidth={1.3}
          strokeLinejoin="round"
          style={{ ...ink, fill: kind.sourceMarker === 'diamond-filled' ? 'var(--color-edge)' : 'var(--color-board)' }}
        />
      )}
      {kind?.arrow === 'open' && (
        <path d={`M${end - head} ${y - head / 2} L${end} ${y} L${end - head} ${y + head / 2}`} fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={ink} />
      )}
      {(kind?.arrow === 'filled' || kind?.arrow === 'hollow') && (
        <path
          d={`M${end - head} ${y - head / 2} L${end} ${y} L${end - head} ${y + head / 2} Z`}
          strokeWidth={1.3}
          strokeLinejoin="round"
          style={{ ...ink, fill: kind.arrow === 'filled' ? 'var(--color-edge)' : 'var(--color-board)' }}
        />
      )}
    </svg>
  );
}
