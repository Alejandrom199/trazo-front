import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, type ReactNode } from 'react';
import { createDiagramFromTemplate, type Difficulty, type Template } from '@/core/model';
import { diagramRegistry, type DiagramModule } from '@/core/registry';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useUiStore } from '@/ui/uiStore';
import { SavedDiagrams } from './SavedDiagrams';
import { TemplatePreview } from './TemplatePreview';

const PREVIEW = { width: 300, height: 150 };

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  básico: 'bg-emerald-50 text-emerald-700',
  intermedio: 'bg-amber-50 text-amber-700',
  avanzado: 'bg-rose-50 text-rose-700',
};

/**
 * Galería para abrir o crear: tus diagramas guardados, uno en blanco o una plantilla.
 * Recorre todos los módulos registrados, así un tipo de diagrama nuevo
 * aparece aquí sin tocar este archivo.
 */
export function TemplateGallery() {
  const isOpen = useUiStore((state) => state.galleryOpen);
  const setGalleryOpen = useUiStore((state) => state.setGalleryOpen);
  const persistenceAvailable = usePersistenceStore((state) => state.repository !== null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setGalleryOpen(false);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, setGalleryOpen]);

  if (!isOpen) return null;

  function openBlank(module: DiagramModule) {
    useDiagramStore.getState().newDiagram({ diagramType: module.diagramType, name: 'Diagrama sin título' });
    setGalleryOpen(false);
  }

  function openTemplate(template: Template) {
    useDiagramStore.getState().openDiagram(createDiagramFromTemplate(template));
    setGalleryOpen(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/25 p-6 backdrop-blur-[2px]"
      onMouseDown={(event) => event.target === event.currentTarget && setGalleryOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gallery-title"
        className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-panel"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-7 py-5">
          <div>
            <h2 id="gallery-title" className="text-lg font-semibold tracking-tight text-ink-900">
              Abrir o crear un diagrama
            </h2>
            <p className="mt-0.5 text-sm text-ink-600">
              Retoma uno de tus diagramas, empieza en blanco o parte de una plantilla que te enseña artefactos concretos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGalleryOpen(false)}
            aria-label="Cerrar"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-canvas hover:text-ink-900"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        </header>

        <div className="overflow-y-auto px-7 py-6">
          <SavedDiagrams onOpened={() => setGalleryOpen(false)} />
          {diagramRegistry.list().map((module) => (
            <section key={module.diagramType}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">{module.displayName}</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                <GalleryCard
                  onClick={() => openBlank(module)}
                  preview={
                    <span className="flex size-10 items-center justify-center rounded-full border border-dashed border-ink-400 text-xl text-ink-400">
                      +
                    </span>
                  }
                  title="En blanco"
                  description="Un lienzo vacío para dibujar desde cero."
                />
                {module.templates.map((template) => (
                  <GalleryCard
                    key={template.id}
                    onClick={() => openTemplate(template)}
                    preview={<TemplatePreview diagram={template.diagram} module={module} {...PREVIEW} />}
                    title={template.name}
                    badge={
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DIFFICULTY_STYLE[template.difficulty]}`}>
                        {template.difficulty}
                      </span>
                    }
                    description={template.description}
                    goals={template.learningGoals.map(
                      (type) => module.artifacts.find((artifact) => artifact.type === type)?.name ?? type,
                    )}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="border-t border-line bg-canvas px-7 py-3 text-xs text-ink-600">
          {persistenceAvailable
            ? 'Tus diagramas se guardan solos en este navegador. Para llevarlos a otro equipo, expórtalos como JSON.'
            : 'Este navegador no permite guardar (¿modo privado?): exporta como JSON para no perder tu trabajo.'}
        </footer>
      </div>
    </div>
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
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-panel focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
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
            <p className="mb-1.5 text-[11px] font-medium text-ink-400">Aprendes</p>
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
