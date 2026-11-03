import { faArrowRight, faDiagramProject, faRoute } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { groupByUmlFamily, UML_DIAGRAMS, UML_FAMILIES, umlKindOf } from '@/core/model';
import { diagramRegistry, type DiagramModule } from '@/core/registry';
import { navigate } from '@/ui/navigation/route';
import { UmlMap } from './UmlMap';

/** Inicio de Aprender: el mapa de UML y una tarjeta por tipo de diagrama, agrupadas por familia. */
export function LearnHome() {
  const groups = groupByUmlFamily(diagramRegistry.list(), (module) => module.diagramType);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-12">
      <header className="max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">Aprender</span>
        <h1 className="mt-2 text-3xl font-semibold text-ink-900 md:text-4xl">Aprende a leer y dibujar diagramas UML</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          Guías interactivas para cada tipo de diagrama: qué es, cómo se lee, cada uno de sus artefactos, ejemplos
          que puedes abrir en el editor y los errores más comunes.
        </p>
      </header>

      <button
        type="button"
        onClick={() => navigate({ page: 'learn-flow' })}
        className="group mt-8 flex w-full items-center gap-5 overflow-hidden rounded-xl border border-accent/30 bg-accent-soft p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <FontAwesomeIcon icon={faRoute} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold text-ink-900">Flow UML</span>
          <span className="mt-1 block max-w-2xl text-sm leading-relaxed text-ink-600">
            Recorre las fases de ingeniería de software y descubre qué pregunta responde cada diagrama UML.
          </span>
        </span>
        <span className="hidden items-center gap-1.5 text-sm font-medium text-accent sm:flex">
          Ver recorrido <FontAwesomeIcon icon={faArrowRight} className="text-xs transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>

      <section className="mt-10" aria-labelledby="uml-map-title">
        <h2 id="uml-map-title" className="text-xl font-semibold text-ink-900">Los diagramas de UML</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-600">
          UML los divide en dos familias: los de <strong className="font-medium text-ink-900">estructura</strong> describen de qué está
          hecho el sistema, y los de <strong className="font-medium text-ink-900">comportamiento</strong>, qué hace y cómo cambia. Los de
          interacción son comportamiento centrado en los mensajes.
        </p>
        <div className="mt-4">
          <UmlMap />
        </div>
      </section>

      {groups.map(({ family, items }) => {
        const upcoming = UML_DIAGRAMS.filter((kind) => kind.family === family && !(kind.diagramType && diagramRegistry.has(kind.diagramType)));
        return (
          <section key={family} className="mt-10" aria-labelledby={`family-${family}`}>
            <h2 id={`family-${family}`} className="text-xl font-semibold text-ink-900">{UML_FAMILIES[family].name}</h2>
            <p className="mt-1.5 text-sm text-ink-600">{UML_FAMILIES[family].question}</p>
            <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {items.map((module) => (
                <GuideCard key={module.diagramType} module={module} />
              ))}
            </div>
            {upcoming.length > 0 && (
              <p className="mt-3 text-xs text-ink-400">Próximamente: {upcoming.map((kind) => kind.name).join(', ')}.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function GuideCard({ module }: { module: DiagramModule }) {
  const isInteraction = umlKindOf(module.diagramType)?.interaction ?? false;
  return (
    <button
      type="button"
      onClick={() => navigate({ page: 'learn-diagram', diagramType: module.diagramType })}
      className="group flex flex-col rounded-xl border border-line bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-panel focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
    >
      <span className="flex items-center justify-between">
        <span className="bg-brand flex size-10 items-center justify-center rounded-lg text-white">
          <FontAwesomeIcon icon={faDiagramProject} />
        </span>
        {isInteraction && <span className="rounded-full bg-raised px-2.5 py-0.5 text-[11px] font-medium text-ink-600">Interacción</span>}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-ink-900">{module.displayName}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-600">{module.guide.summary}</p>
      <p className="mt-4 text-xs text-ink-400">
        {module.artifacts.length} artefactos, {module.templates.length} ejemplos y {module.rules.length} reglas
      </p>
      <span className="mt-3 flex items-center gap-1.5 text-sm font-medium text-accent">
        Empezar la guía
        <FontAwesomeIcon icon={faArrowRight} className="text-xs transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
