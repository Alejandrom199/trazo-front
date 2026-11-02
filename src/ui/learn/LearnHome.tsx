import { faArrowRight, faDiagramProject, faLayerGroup, faPeopleArrows, faRoute, faSitemap, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { DiagramType } from '@/core/model';
import { diagramRegistry } from '@/core/registry';
import { navigate } from '@/ui/navigation/route';

/** Tipos de diagrama del plan que todavía no tienen módulo: se muestran como "próximamente". */
const PLANNED: { diagramType: DiagramType; name: string; summary: string; icon: IconDefinition }[] = [
  {
    diagramType: 'sequence',
    name: 'Diagrama de secuencia',
    summary: 'Los mensajes que intercambian los participantes de una interacción, en orden temporal.',
    icon: faPeopleArrows,
  },
  {
    diagramType: 'usecase',
    name: 'Diagrama de casos de uso',
    summary: 'Qué puede hacer cada actor con el sistema, sin entrar en cómo lo hace.',
    icon: faSitemap,
  },
  {
    diagramType: 'class',
    name: 'Diagrama de clases',
    summary: 'La estructura del sistema: clases, atributos, operaciones y cómo se relacionan.',
    icon: faLayerGroup,
  },
];

/** Inicio de Aprender: una tarjeta por tipo de diagrama. */
export function LearnHome() {
  const available = diagramRegistry.list();
  const planned = PLANNED.filter((entry) => !diagramRegistry.has(entry.diagramType));

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

      <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {available.map((module) => (
          <button
            key={module.diagramType}
            type="button"
            onClick={() => navigate({ page: 'learn-diagram', diagramType: module.diagramType })}
            className="group flex flex-col rounded-xl border border-line bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-panel focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
          >
            <span className="bg-brand flex size-10 items-center justify-center rounded-lg text-white">
              <FontAwesomeIcon icon={faDiagramProject} />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink-900">{module.displayName}</h2>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-600">{module.guide.summary}</p>
            <p className="mt-4 text-xs text-ink-400">
              {module.artifacts.length} artefactos, {module.templates.length} ejemplos y {module.rules.length} reglas
            </p>
            <span className="mt-3 flex items-center gap-1.5 text-sm font-medium text-accent">
              Empezar la guía
              <FontAwesomeIcon icon={faArrowRight} className="text-xs transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}

        {planned.map((entry) => (
          <div key={entry.diagramType} className="flex flex-col rounded-xl border border-dashed border-line p-5" aria-disabled>
            <span className="flex size-10 items-center justify-center rounded-lg bg-raised text-ink-400">
              <FontAwesomeIcon icon={entry.icon} />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink-600">{entry.name}</h2>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-400">{entry.summary}</p>
            <span className="mt-4 w-fit rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-ink-400">Próximamente</span>
          </div>
        ))}
      </div>
    </div>
  );
}
