import {
  faArrowLeft,
  faChevronRight,
  faDiagramProject,
  faPlus,
  faShapes,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState, type ReactNode } from 'react';
import { createDiagramFromTemplate, groupByUmlFamily, UML_FAMILIES, type Difficulty, type DiagramType, type Template, type UmlFamily } from '@/core/model';
import { diagramRegistry, type DiagramModule } from '@/core/registry';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useUiStore } from '@/ui/uiStore';
import { SavedDiagrams } from './SavedDiagrams';
import { TemplatePreview } from './TemplatePreview';

const PREVIEW = { width: 300, height: 150 };

const FAMILY_SHORT: Record<UmlFamily, string> = { structure: 'Estructura', behavior: 'Comportamiento' };

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  básico: 'bg-success-soft text-success',
  intermedio: 'bg-warning-soft text-warning',
  avanzado: 'bg-danger-soft text-danger',
};

/** Cuántos diagramas propios se ven en el inicio; el resto, con «Ver todos». */
const RECENT_LIMIT = 4;

type GalleryView =
  | { step: 'start' }
  | { step: 'saved' }
  | { step: 'examples'; diagramType: DiagramType };

/** Nombre corto para opciones donde el contexto ya deja claro que es un diagrama. */
function shortDiagramName(module: DiagramModule): string {
  const name = module.displayName.replace(/^Diagrama de\s+/i, '');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Flujo para crear o abrir diagramas. Las plantillas viven en un recorrido
 * secundario para que "Nuevo" no presente de golpe todos los ejemplos.
 */
export function TemplateGallery() {
  const isOpen = useUiStore((state) => state.galleryOpen);
  const setGalleryOpen = useUiStore((state) => state.setGalleryOpen);
  const persistenceAvailable = usePersistenceStore((state) => state.repository !== null);
  const [view, setView] = useState<GalleryView>({ step: 'start' });
  // Agrupados como UML: estructura y comportamiento.
  const groups = groupByUmlFamily(diagramRegistry.list(), (module) => module.diagramType);
  const modules = groups.flatMap((group) => group.items);

  useEffect(() => {
    if (!isOpen) {
      setView({ step: 'start' });
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setGalleryOpen(false);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, setGalleryOpen]);

  if (!isOpen) return null;

  const selectedModule = view.step === 'examples' ? diagramRegistry.get(view.diagramType) : null;
  const { title, subtitle } = {
    start: { title: 'Nuevo diagrama', subtitle: 'Empieza en blanco, retoma un trabajo o explora un ejemplo cuando lo necesites.' },
    saved: { title: 'Tus diagramas', subtitle: 'Todo lo que guardaste en este navegador, del más reciente al más antiguo.' },
    examples: { title: 'Ejemplos', subtitle: 'Elige un tipo y abre una copia editable para practicar.' },
  }[view.step];

  function openBlank(module: DiagramModule) {
    useDiagramStore.getState().newDiagram({ diagramType: module.diagramType, name: 'Diagrama sin título' });
    setGalleryOpen(false);
  }

  function openTemplate(template: Template) {
    useDiagramStore.getState().openDiagram(createDiagramFromTemplate(template));
    setGalleryOpen(false);
  }

  function goBack() {
    setView({ step: 'start' });
  }

  return (
    <div
      className="motion-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[2px] md:p-6"
      onMouseDown={(event) => event.target === event.currentTarget && setGalleryOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gallery-title"
        className="flex h-[calc(100dvh-1.5rem)] max-h-[760px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-panel md:h-[calc(100dvh-3rem)]"
      >
        <header className="relative flex items-start justify-between gap-4 bg-brand px-5 py-5 text-white md:px-8 md:py-7">
          <div className="flex min-w-0 items-start gap-3">
            {view.step !== 'start' && (
              <button
                type="button"
                onClick={goBack}
                aria-label="Volver"
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
              </button>
            )}
            <div className="min-w-0">
              <h2 id="gallery-title" className="truncate text-2xl font-semibold tracking-tight">
                {title}
              </h2>
              <p className="mt-1 max-w-xl text-sm text-white/85">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setGalleryOpen(false)}
            aria-label="Cerrar"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-7 md:py-6">
          {view.step === 'start' && (
            <StartView
              modules={modules}
              onOpenBlank={openBlank}
              onShowExamples={() => {
                const firstModule = modules[0];
                if (firstModule) setView({ step: 'examples', diagramType: firstModule.diagramType });
              }}
              onSavedOpened={() => setGalleryOpen(false)}
              onShowAllSaved={() => setView({ step: 'saved' })}
            />
          )}

          {view.step === 'saved' && <SavedDiagrams onOpened={() => setGalleryOpen(false)} />}

          {view.step === 'examples' && selectedModule && (
            <section aria-label="Ejemplos por tipo de diagrama">
              {/* Fija arriba al desplazarse: los tipos de diagrama siempre a mano. */}
              <div
                role="tablist"
                aria-label="Tipo de diagrama"
                className="sticky -top-5 z-10 -mx-4 -mt-5 flex flex-wrap gap-2.5 border-b border-line bg-surface px-4 pt-5 pb-4 md:-top-6 md:-mx-7 md:-mt-6 md:px-7 md:pt-6"
              >
                {groups.map((group) => (
                  <div key={group.family} role="presentation" className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[11px] font-semibold tracking-wider text-ink-400 uppercase">{FAMILY_SHORT[group.family]}</span>
                    {group.items.map((module) => {
                      const active = module.diagramType === selectedModule.diagramType;
                      return (
                        <button
                          key={module.diagramType}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setView({ step: 'examples', diagramType: module.diagramType })}
                          className={`flex items-center gap-2.5 rounded-full border py-2.5 pr-3 pl-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                            active
                              ? 'border-accent bg-accent-soft text-accent'
                              : 'border-line bg-raised text-ink-900 hover:border-accent/45 hover:bg-accent-soft'
                          }`}
                        >
                          <FontAwesomeIcon icon={faDiagramProject} className="text-xs" />
                          <span className="text-sm font-medium">{shortDiagramName(module)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium shadow-sm ${active ? 'bg-surface text-accent' : 'bg-surface text-ink-600'}`}>
                            {module.templates.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div role="tabpanel" className="mt-5">
                <h3 className="mb-3 text-sm font-semibold text-ink-900">Ejemplos de {shortDiagramName(selectedModule).toLowerCase()}</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
                  {selectedModule.templates.map((template) => (
                    <GalleryCard
                      key={template.id}
                      onClick={() => openTemplate(template)}
                      preview={<TemplatePreview diagram={template.diagram} module={selectedModule} {...PREVIEW} />}
                      title={template.name}
                      badge={<DifficultyBadge difficulty={template.difficulty} />}
                      description={template.description}
                      goals={template.learningGoals.map(
                        (type) => selectedModule.artifacts.find((artifact) => artifact.type === type)?.name ?? type,
                      )}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <footer className="border-t border-line bg-canvas px-4 py-3 text-xs text-ink-600 md:px-7">
          {persistenceAvailable
            ? 'Tus diagramas se guardan solos en este navegador. Para llevarlos a otro equipo, expórtalos como JSON.'
            : 'Este navegador no permite guardar (¿modo privado?): exporta como JSON para no perder tu trabajo.'}
        </footer>
      </div>
    </div>
  );
}

function StartView({
  modules,
  onOpenBlank,
  onShowExamples,
  onSavedOpened,
  onShowAllSaved,
}: {
  modules: DiagramModule[];
  onOpenBlank: (module: DiagramModule) => void;
  onShowExamples: () => void;
  onSavedOpened: () => void;
  onShowAllSaved: () => void;
}) {
  return (
    <>
      <SavedDiagrams onOpened={onSavedOpened} limit={RECENT_LIMIT} onShowAll={onShowAllSaved} />

      <section aria-labelledby="blank-diagrams-title">
        <h3 id="blank-diagrams-title" className="mb-3 text-sm font-semibold text-ink-900">
          Crear en blanco
        </h3>
        {groupByUmlFamily(modules, (module) => module.diagramType).map((group) => (
          <div key={group.family} className="mb-4 last:mb-0">
            <p className="mb-2 text-xs text-ink-400">{UML_FAMILIES[group.family].name}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.items.map((module) => (
                <button
                  key={module.diagramType}
                  type="button"
                  onClick={() => onOpenBlank(module)}
                  className="group flex items-center gap-4 rounded-xl border border-line bg-surface p-4 text-left hover:border-accent/45 hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-ink-400 text-accent group-hover:border-accent">
                    <FontAwesomeIcon icon={faPlus} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink-900 group-hover:text-accent">{shortDiagramName(module)}</span>
                    <span className="mt-1 block text-xs text-ink-600">Lienzo vacío para construirlo desde cero.</span>
                  </span>
                  <FontAwesomeIcon icon={faChevronRight} className="text-xs text-ink-400 group-hover:text-accent" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-6 border-t border-line pt-5" aria-labelledby="examples-entry-title">
        <button
          type="button"
          onClick={onShowExamples}
          className="group flex w-full items-center gap-4 rounded-xl bg-accent-soft px-4 py-3.5 text-left hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface text-accent shadow-sm">
            <FontAwesomeIcon icon={faShapes} />
          </span>
          <span className="min-w-0 flex-1">
            <span id="examples-entry-title" className="block text-sm font-semibold text-accent">
              Ejemplos
            </span>
            <span className="mt-0.5 block text-xs text-ink-600">Explora diagramas completos y abre una copia para practicar.</span>
          </span>
          <FontAwesomeIcon icon={faChevronRight} className="text-xs text-accent" />
        </button>
      </section>
    </>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DIFFICULTY_STYLE[difficulty]}`}>
      {difficulty}
    </span>
  );
}

interface GalleryCardProps {
  onClick: () => void;
  preview: ReactNode;
  title: string;
  badge?: ReactNode;
  description: string;
  goals?: string[];
}

function GalleryCard({ onClick, preview, title, badge, description, goals }: GalleryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface text-left transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 motion-reduce:hover:translate-y-0"
    >
      <div className="flex h-[150px] items-center justify-center border-b border-line bg-canvas">{preview}</div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-ink-900 group-hover:text-accent">{title}</span>
          {badge}
        </div>
        <p className="text-xs leading-relaxed text-ink-600">{description}</p>
        {goals && goals.length > 0 && (
          <div className="mt-auto pt-1">
            <p className="mb-1.5 text-[11px] font-medium text-ink-400">Incluye</p>
            <div className="flex flex-wrap gap-1">
              {goals.map((goal) => (
                <span key={goal} className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">
                  {goal}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
