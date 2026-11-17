import { faFileLines } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { DiagramNode } from '@/core/model';
import { readSpec } from '@/diagrams/usecase/spec';
import { useUiStore } from '@/ui/uiStore';

/** Acceso a la ficha del caso de uso desde sus propiedades. */
export function UseCaseSheetField({ node }: { node: DiagramNode }) {
  const spec = readSpec(node);
  const steps = spec?.typicalCourse.length ?? 0;
  return (
    <button
      type="button"
      onClick={() => useUiStore.getState().setUseCaseSheetNodeId(node.id)}
      className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:border-accent/50 hover:bg-accent-soft/40"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><FontAwesomeIcon icon={faFileLines} className="text-sm" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink-900">{spec ? `Ficha ${spec.code}` : 'Escribir su ficha'}</span>
        <span className="block text-[11px] text-ink-400">{spec ? `${steps} ${steps === 1 ? 'paso' : 'pasos'} en el curso típico` : 'Propósito, pasos del actor y del sistema, cursos alternos'}</span>
      </span>
    </button>
  );
}
