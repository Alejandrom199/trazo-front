import type { DiagramNode } from '@/core/model';
import type { NodeKind } from '@/core/registry';

interface ArtifactFigureProps {
  kind: NodeKind;
  artifactType: string;
  /** Caja disponible; la figura se ajusta dentro conservando sus proporciones. */
  box: { width: number; height: number };
  /** Texto a mostrar dentro de la figura (si el artefacto lleva texto). */
  label?: string;
}

/**
 * Figura de un artefacto fuera del lienzo (paleta, página Aprender): el mismo
 * componente del lienzo dibujado directamente al tamaño final. No se escala con
 * CSS: así el trazo mantiene su grosor real y se ve igual de nítido en tema claro
 * y oscuro (un carril escalado al 5 % perdía el borde).
 */
export function ArtifactFigure({ kind, artifactType, box, label }: ArtifactFigureProps) {
  const size = kind.previewSize ?? kind.defaultSize;
  const minSide = Math.min(box.width, box.height) * 0.6;
  const scale = Math.min(box.width / size.width, box.height / size.height, 1);
  const width = Math.max(size.width * scale, minSide);
  const height = Math.max(size.height * scale, Math.min(minSide, size.height));
  const figureNode: DiagramNode = {
    id: `figure-${artifactType}`,
    artifactType,
    label: label ?? '',
    position: { x: 0, y: 0 },
    size: { width, height },
    parentId: null,
    props: kind.defaultProps,
    notes: '',
    locked: false,
  };
  const Shape = kind.component;

  return (
    <div className="pointer-events-none flex shrink-0 items-center justify-center" style={box} aria-hidden>
      <div style={{ width, height, flexShrink: 0 }}>
        <Shape node={figureNode} selected={false} label={kind.hasLabel && label ? label : null} />
      </div>
    </div>
  );
}
