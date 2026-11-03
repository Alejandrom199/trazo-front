import { faChevronDown, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMemo } from 'react';
import { ARTIFACT_CATEGORIES } from '@/core/model';
import type { DiagramModule } from '@/core/registry';
import { ArtifactFigure } from '@/ui/artifacts/ArtifactFigure';
import { ArtifactExplanation } from '@/ui/explanation/ArtifactExplanation';
import { EdgeFigure } from '@/ui/artifacts/EdgeFigure';


/** Id del ancla de un artefacto en la guía, para saltar a él desde otras secciones. */
export const artifactAnchor = (type: string) => `guia-artefacto-${type}`;

interface ArtifactCatalogProps {
  module: DiagramModule;
  expandedType: string | null;
  onToggle: (type: string) => void;
  /** Abre otro artefacto (relacionado) y lleva la vista hasta él. */
  onOpenRelated: (type: string) => void;
  onTry: (type: string) => void;
}

/**
 * Todos los artefactos del diagrama, por categoría. Cada tarjeta muestra la figura
 * real y qué es; al abrirla, la ficha completa (la misma del editor) y un botón
 * para probarlo en el lienzo.
 */
export function ArtifactCatalog({ module, expandedType, onToggle, onOpenRelated, onTry }: ArtifactCatalogProps) {
  const definitionsByType = useMemo(() => new Map(module.artifacts.map((artifact) => [artifact.type, artifact])), [module]);

  return (
    <div className="flex flex-col gap-8">
      {ARTIFACT_CATEGORIES.map(({ category, title }) => {
        const artifacts = module.artifacts.filter((artifact) => artifact.category === category);
        if (artifacts.length === 0) return null;
        return (
          <section key={category}>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{title}</h3>
            <div className="flex flex-col gap-2">
              {artifacts.map((artifact) => {
                const kind = module.nodeKinds[artifact.type];
                const expanded = expandedType === artifact.type;
                return (
                  <article
                    key={artifact.type}
                    id={artifactAnchor(artifact.type)}
                    className={`scroll-mt-6 overflow-hidden rounded-xl border bg-surface transition-colors ${
                      expanded ? 'border-accent/50' : 'border-line'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggle(artifact.type)}
                      aria-expanded={expanded}
                      className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-raised"
                    >
                      <span className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-canvas">
                        {kind ? (
                          <ArtifactFigure kind={kind} artifactType={artifact.type} box={{ width: 80, height: 44 }} />
                        ) : (
                          <EdgeFigure kind={module.edgeKinds[artifact.type]} box={{ width: 80, height: 44 }} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-ink-900">{artifact.name}</span>
                        <span className="mt-0.5 line-clamp-2 block text-sm text-ink-600">{artifact.whatIs}</span>
                      </span>
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className={`shrink-0 text-xs text-ink-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {expanded && (
                      <div className="border-t border-line">
                        <ArtifactExplanation
                          definition={artifact}
                          definitionsByType={definitionsByType}
                          onOpenRelated={onOpenRelated}
                        />
                        {kind && (
                          <div className="px-4 pb-4">
                            <button
                              type="button"
                              onClick={() => onTry(artifact.type)}
                              className="bg-brand flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium text-white hover:opacity-90"
                            >
                              <FontAwesomeIcon icon={faPlus} className="text-xs" />
                              Probarlo en el lienzo
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
