import { faArrowTurnUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { callersOf, nodeName } from '@/core/model';
import { useDiagramStore } from '@/core/store/diagramStore';
import { openSavedDiagram } from './projectActions';
import { useProjectDiagrams } from './useProjectDiagrams';

/**
 * Si el diagrama abierto es el subproceso de otro del proyecto, un botón para
 * volver al proceso que lo invoca, con el paso que lo llama ya seleccionado.
 * Con varios que lo invocan, vuelve al primero en el orden del proyecto.
 */
export function SubprocessBreadcrumb() {
  const currentId = useDiagramStore((state) => state.diagram?.id);
  const diagrams = useProjectDiagrams();
  const caller = currentId ? callersOf(diagrams, currentId)[0] : undefined;
  if (!caller) return null;

  function goBack() {
    if (!caller) return;
    openSavedDiagram(caller.diagram.id);
    useDiagramStore.getState().setSelection({ nodeIds: [caller.node.id], edgeIds: [] });
  }

  return (
    <button
      type="button"
      onClick={goBack}
      title={`Volver a «${caller.diagram.name}», donde «${nodeName(caller.node)}» invoca este subproceso`}
      className="glass-panel relative flex h-11 max-w-64 items-center gap-2 rounded-xl px-3 text-[13px] text-ink-600 transition-colors hover:text-ink-900 sm:px-3.5"
    >
      <FontAwesomeIcon icon={faArrowTurnUp} className="-scale-x-100" />
      <span className="truncate">Subproceso de «{caller.diagram.name}»</span>
    </button>
  );
}
