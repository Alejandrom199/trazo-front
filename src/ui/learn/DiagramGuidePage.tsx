import { faArrowLeft, faLightbulb, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import type { DiagramModule } from '@/core/registry';
import { navigate } from '@/ui/navigation/route';
import { ArtifactCatalog, artifactAnchor } from './ArtifactCatalog';
import { ArtifactQuiz } from './ArtifactQuiz';
import { ExampleCatalog } from './ExampleCatalog';
import { useGuideActions } from './guideActions';
import { HowToRead } from './HowToRead';
import { LearningWorkshop } from './LearningWorkshop';
import { RuleCatalog } from './RuleCatalog';

const SECTIONS = [
  { id: 'guia-que-es', title: 'Qué es' },
  { id: 'guia-idea', title: 'La idea clave' },
  { id: 'guia-leer', title: 'Cómo leerlo' },
  { id: 'guia-artefactos', title: 'Artefactos' },
  { id: 'guia-prueba', title: 'Ponte a prueba' },
  { id: 'guia-taller', title: 'Taller' },
  { id: 'guia-ejemplos', title: 'Ejemplos' },
  { id: 'guia-errores', title: 'Errores típicos' },
] as const;

interface DiagramGuidePageProps {
  module: DiagramModule;
  /** Contenedor con scroll de la página: el índice lo observa para marcar la sección visible. */
  scrollRoot: RefObject<HTMLElement | null>;
}

/** Guía interactiva de un tipo de diagrama, con índice lateral como una documentación. */
export function DiagramGuidePage({ module, scrollRoot }: DiagramGuidePageProps) {
  const actions = useGuideActions();
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const activeSection = useActiveSection(scrollRoot);

  /** Abre la tarjeta de un artefacto y lleva la vista hasta ella. */
  function showArtifact(type: string) {
    setExpandedType(type);
    window.requestAnimationFrame(() =>
      document.getElementById(artifactAnchor(type))?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }

  const { guide } = module;

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-10 px-5 py-8 md:px-10 md:py-10">
      <nav aria-label="En esta guía" className="sticky top-8 hidden h-fit w-48 shrink-0 lg:block">
        <button
          type="button"
          onClick={() => navigate({ page: 'learn' })}
          className="mb-5 flex items-center gap-2 text-sm text-ink-400 hover:text-ink-900"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" /> Todos los diagramas
        </button>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">En esta guía</p>
        <ul className="border-l border-line">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className={`-ml-px block border-l-2 py-1.5 pl-3 text-left text-sm transition-colors ${
                  activeSection === section.id ? 'border-accent font-medium text-accent' : 'border-transparent text-ink-600 hover:text-ink-900'
                }`}
              >
                {section.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => navigate({ page: 'learn' })}
          className="mb-4 flex items-center gap-2 text-sm text-ink-400 hover:text-ink-900 lg:hidden"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" /> Todos los diagramas
        </button>

        <header id="guia-que-es" className="scroll-mt-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">Guía interactiva</span>
          {module.maturity === 'preview' && (
            <p className="mt-3 max-w-2xl rounded-lg bg-warning-soft px-3 py-2 text-sm leading-relaxed text-ink-900">
              Vista previa. Puedes dibujarlo y validar lo esencial, pero sus reglas, propiedades y talleres todavía no tienen la profundidad de Actividad, Secuencia o Clases.
            </p>
          )}
          <h1 className="mt-2 text-3xl font-semibold text-ink-900 md:text-4xl">{module.displayName}</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-600">{guide.summary}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => actions.startBlank(module.diagramType)}
              className="bg-brand flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
              Crear uno en blanco
            </button>
            <button
              type="button"
              onClick={() => document.getElementById('guia-ejemplos')?.scrollIntoView({ behavior: 'smooth' })}
              className="rounded-md border border-line px-4 py-2 text-sm text-ink-900 hover:bg-raised"
            >
              Ver ejemplos
            </button>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <InfoList title="Para qué sirve" items={guide.purposes} marker="bg-accent" />
            <InfoList title="Cuándo usarlo" items={guide.whenToUse} marker="bg-success" />
            <InfoList title="Cuándo no" items={guide.whenNotToUse} marker="bg-ink-400" />
          </div>
        </header>

        <Section id="guia-idea" title="La idea clave">
          <div className="flex gap-4 rounded-xl border border-accent/30 bg-accent-soft p-5">
            <span className="bg-brand flex size-9 shrink-0 items-center justify-center rounded-lg text-white">
              <FontAwesomeIcon icon={faLightbulb} />
            </span>
            <div>
              <h3 className="text-[15px] font-semibold text-ink-900">{guide.keyIdea.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">{guide.keyIdea.text}</p>
            </div>
          </div>
        </Section>

        <Section id="guia-leer" title="Cómo leerlo" lead="Recorre el diagrama en este orden. Elige un paso para ver sus artefactos.">
          <HowToRead module={module} />
        </Section>

        <Section id="guia-artefactos" title="Artefactos" lead="Cada pieza del diagrama: qué es, cuándo usarla y los errores comunes. Ábrela para ver la ficha completa.">
          <ArtifactCatalog
            module={module}
            expandedType={expandedType}
            onToggle={(type) => setExpandedType(expandedType === type ? null : type)}
            onOpenRelated={showArtifact}
            onTry={actions.tryArtifact}
          />
        </Section>

        <Section id="guia-prueba" title="Ponte a prueba" lead="Reconoce cada artefacto por su forma.">
          {/* key: al cambiar de diagrama el cuestionario empieza de nuevo (su pregunta es de ese módulo). */}
          <ArtifactQuiz key={module.diagramType} module={module} />
        </Section>

        {guide.workshop && (
          <Section id="guia-taller" title="Practica como analista" lead="La dificultad está en las decisiones de modelado, no en la cantidad de figuras.">
            <LearningWorkshop module={module} workshop={guide.workshop} onOpen={actions.openTemplate} />
          </Section>
        )}

        <Section id="guia-ejemplos" title="Ejemplos" lead="Diagramas completos para estudiar. Ábrelos en el editor para modificarlos.">
          {/* key: al cambiar de diagrama se quita el filtro de dificultad. */}
          <ExampleCatalog key={module.diagramType} module={module} criteria={guide.difficultyCriteria} onOpen={actions.openTemplate} onShowArtifact={showArtifact} />
        </Section>

        <Section id="guia-errores" title="Errores típicos" lead="Lo que revisa el panel de problemas del editor mientras dibujas, y por qué.">
          <RuleCatalog module={module} />
        </Section>
      </div>
    </div>
  );
}

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-14 scroll-mt-8">
      <h2 className="text-2xl font-semibold text-ink-900">{title}</h2>
      {lead && <p className="mt-1.5 text-sm text-ink-600">{lead}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InfoList({ title, items, marker }: { title: string; items: string[]; marker: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-600">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span className={`mt-[0.6em] size-1.5 shrink-0 rounded-full ${marker}`} aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Sección visible en pantalla (la más arriba que ya entró), para marcarla en el índice. */
function useActiveSection(scrollRoot: RefObject<HTMLElement | null>): string {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const root = scrollRoot.current;
    if (!root) return;
    const update = () => {
      const limit = root.getBoundingClientRect().top + 120;
      let current: string = SECTIONS[0].id;
      for (const section of SECTIONS) {
        const element = document.getElementById(section.id);
        if (element && element.getBoundingClientRect().top <= limit) current = section.id;
      }
      setActive(current);
    };
    update();
    root.addEventListener('scroll', update, { passive: true });
    return () => root.removeEventListener('scroll', update);
  }, [scrollRoot]);

  return active;
}
