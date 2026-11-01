import { NO_JOINTS } from '@/core/model';
import { CONTAINER_GRIP_CLASS, readNumberProperty, type ArtifactNodeProps, type NumberPropertyDefinition } from '@/core/registry';
import { MUTED_STROKE, STROKE_WIDTH, strokeFor } from '@/diagrams/shared/shapeStyles';

/** Alto del encabezado de un carril de tamaño normal. */
const HEADER_HEIGHT = 40;

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
export function PartitionShape({ node, selected, label, joints = NO_JOINTS }: ArtifactNodeProps) {
  const color = selected ? strokeFor(true) : MUTED_STROKE;
  // Proporcionales al tamaño para que un carril pequeño (o su miniatura) siga pareciendo un carril.
  const headerHeight = Math.min(HEADER_HEIGHT, node.size.height * 0.25);
  const radius = Math.min(readNumberProperty(node, containerCornerRadius), node.size.width / 4);
  // Donde llega un carril vecino, esa esquina queda recta. Un lado cubierto de punta a
  // punta por vecinos no dibuja borde (ya lo dibuja el vecino); si solo se tocan en un
  // tramo, cada carril conserva el suyo.
  const { coveredSides, squareCorners } = joints;
  const corner = (square: boolean) => (square ? 0 : radius);
  const border = `${STROKE_WIDTH}px solid ${color}`;
  return (
    <div
      className="flex size-full flex-col overflow-hidden"
      style={{
        borderTop: coveredSides.top ? 'none' : border,
        borderLeft: coveredSides.left ? 'none' : border,
        borderRight: border,
        borderBottom: border,
        borderRadius: `${corner(squareCorners.topLeft)}px ${corner(squareCorners.topRight)}px ${corner(squareCorners.bottomRight)}px ${corner(squareCorners.bottomLeft)}px`,
      }}
    >
      <div
        className={`${CONTAINER_GRIP_CLASS} flex shrink-0 items-center justify-center bg-surface px-3 text-center text-[13px] font-medium text-ink-900`}
        style={{ height: headerHeight, borderBottom: `${STROKE_WIDTH}px solid ${color}` }}
      >
        {label}
      </div>
    </div>
  );
}
