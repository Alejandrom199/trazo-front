import { useReactFlow } from '@xyflow/react';
import { useRef, useState, type PointerEvent } from 'react';
import type { Position } from '@/core/model';
import type { DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { lassoSelection } from './lasso';

/** Distancia mínima entre puntos del trazo: evita guardar cientos de puntos casi iguales. */
const MIN_STEP = 4;

/**
 * Capa del lápiz: encima del lienzo, recoge el trazo a mano alzada y, al soltar,
 * selecciona lo que quedó dentro. Con Shift suma a la selección que ya había.
 */
export function LassoLayer({ module }: { module: DiagramModule }) {
  const { screenToFlowPosition } = useReactFlow();
  // Los puntos van en un ref (los eventos llegan más rápido que los renders); el estado solo redibuja.
  const points = useRef<Position[] | null>(null);
  const [stroke, setStroke] = useState<{ origin: Position; points: Position[] } | null>(null);

  function start(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Sin captura el trazo sigue funcionando mientras el puntero no salga del lienzo.
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    points.current = [{ x: event.clientX, y: event.clientY }];
    setStroke({ origin: { x: bounds.left, y: bounds.top }, points: points.current });
  }

  function extend(event: PointerEvent<HTMLDivElement>) {
    const current = points.current;
    if (!current) return;
    const last = current.at(-1)!;
    if (Math.hypot(event.clientX - last.x, event.clientY - last.y) < MIN_STEP) return;
    points.current = [...current, { x: event.clientX, y: event.clientY }];
    setStroke((previous) => previous && { ...previous, points: points.current! });
  }

  function finish(event: PointerEvent<HTMLDivElement>) {
    const drawn = points.current;
    points.current = null;
    setStroke(null);
    const { diagram, selection, setSelection } = useDiagramStore.getState();
    if (!drawn || !diagram) return;
    const polygon = drawn.map((point) => screenToFlowPosition(point));
    const found = lassoSelection(diagram, polygon, (type) => module.nodeKinds[type]?.isContainer ?? false);
    setSelection(
      event.shiftKey
        ? { nodeIds: [...new Set([...selection.nodeIds, ...found.nodeIds])], edgeIds: [...new Set([...selection.edgeIds, ...found.edgeIds])] }
        : found,
    );
  }

  const path = stroke?.points.map((point) => `${point.x - stroke.origin.x},${point.y - stroke.origin.y}`).join(' ');

  return (
    <div
      className="absolute inset-0 z-[5] cursor-crosshair touch-none"
      onPointerDown={start}
      onPointerMove={extend}
      onPointerUp={finish}
      onPointerCancel={() => {
        points.current = null;
        setStroke(null);
      }}
    >
      {path && (
        <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
          <polygon
            points={path}
            style={{ fill: 'var(--color-accent-soft)', stroke: 'var(--color-accent)' }}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}
