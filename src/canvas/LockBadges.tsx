import { faLock } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ViewportPortal } from '@xyflow/react';
import { absolutePosition } from '@/core/model';
import { useDiagramStore } from '@/core/store/diagramStore';

/** Diámetro del distintivo, en píxeles del lienzo. */
const BADGE = 18;

/**
 * Candados de los nodos bloqueados, en una capa por encima de todo el diagrama.
 * Si fueran parte de cada nodo, el nodo o carril que se dibuja después (un
 * carril vecino, un hijo) los taparía; en esta capa siempre quedan al frente.
 * Usan coordenadas del lienzo, así que acompañan al nodo al hacer zoom o desplazar.
 */
export function LockBadges() {
  const diagram = useDiagramStore((state) => state.diagram);
  if (!diagram) return null;

  return (
    <ViewportPortal>
      {/* data-export-ignore: los candados son de edición; no salen al exportar la imagen. */}
      <div data-export-ignore>
        {diagram.nodes
          .filter((node) => node.locked)
          .map((node) => {
            const origin = absolutePosition(diagram, node);
            return (
              <span
                key={node.id}
                title="Bloqueado: no se puede mover ni borrar"
                className="absolute flex items-center justify-center rounded-full border border-line bg-surface text-[9px] text-ink-600 shadow-panel"
                style={{
                  width: BADGE,
                  height: BADGE,
                  transform: `translate(${origin.x + node.size.width - BADGE / 2}px, ${origin.y - BADGE / 2}px)`,
                  zIndex: 1000,
                }}
              >
                <FontAwesomeIcon icon={faLock} />
              </span>
            );
          })}
      </div>
    </ViewportPortal>
  );
}
