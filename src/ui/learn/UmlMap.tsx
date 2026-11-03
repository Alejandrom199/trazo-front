import { UML_DIAGRAMS, UML_FAMILIES, UML_INTERACTION_NAME, type UmlDiagramKind, type UmlFamily } from '@/core/model';
import { diagramRegistry } from '@/core/registry';
import { navigate } from '@/ui/navigation/route';

/**
 * Mapa de los 14 diagramas de UML 2.5 como árbol: Diagrama → estructura y
 * comportamiento → (interacción). Los que ya están en Trazo abren su guía; el
 * resto se ve atenuado como «próximamente».
 */
export function UmlMap() {
  return (
    <figure className="rounded-xl border border-line bg-surface p-4 md:p-6" aria-label="Clasificación de los diagramas UML">
      <div className="flex flex-col items-center">
        <span className="rounded-lg border border-ink-400 px-4 py-2 text-sm font-semibold text-ink-900">Diagrama UML</span>
        <span className="h-4 w-px bg-line" aria-hidden />
      </div>
      <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Rama horizontal que une las dos familias (centro de cada columna). */}
        <span className="absolute top-0 right-[calc(25%-0.25rem)] left-[calc(25%-0.25rem)] hidden h-px bg-line sm:block" aria-hidden />
        {(['structure', 'behavior'] as UmlFamily[]).map((family) => (
          <FamilyBranch key={family} family={family} />
        ))}
      </div>
      <figcaption className="mt-4 text-center text-xs text-ink-400">
        UML 2.5 define 14 diagramas. Los resaltados ya están en Trazo: haz clic para abrir su guía.
      </figcaption>
    </figure>
  );
}

function FamilyBranch({ family }: { family: UmlFamily }) {
  const kinds = UML_DIAGRAMS.filter((kind) => kind.family === family);
  const plain = kinds.filter((kind) => !kind.interaction);
  const interaction = kinds.filter((kind) => kind.interaction);
  return (
    <div className="flex flex-col items-center">
      <span className="hidden h-4 w-px bg-line sm:block" aria-hidden />
      <div className="w-full rounded-lg border border-line bg-canvas p-3">
        <p className="text-center text-[13px] font-semibold text-ink-900">{UML_FAMILIES[family].name}</p>
        <ul className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          {plain.map((kind) => (
            <KindChip key={kind.name} kind={kind} />
          ))}
        </ul>
        {interaction.length > 0 && (
          <div className="mt-3 rounded-md border border-dashed border-line p-2.5">
            <p className="text-center text-xs font-semibold text-ink-600">{UML_INTERACTION_NAME}</p>
            <ul className="mt-2 flex flex-wrap justify-center gap-1.5">
              {interaction.map((kind) => (
                <KindChip key={kind.name} kind={kind} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function KindChip({ kind }: { kind: UmlDiagramKind }) {
  const diagramType = kind.diagramType && diagramRegistry.has(kind.diagramType) ? kind.diagramType : null;
  if (!diagramType) {
    return (
      <li title={`${kind.summary} Próximamente en Trazo.`} className="rounded-md border border-dashed border-line px-2.5 py-1 text-xs text-ink-400">
        {kind.name}
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        title={kind.summary}
        onClick={() => navigate({ page: 'learn-diagram', diagramType })}
        className="rounded-md border border-accent/40 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent hover:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
      >
        {kind.name}
      </button>
    </li>
  );
}
