import { faArrowUpRightFromSquare, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import type { Difficulty, Template } from '@/core/model';
import type { DiagramGuide, DiagramModule } from '@/core/registry';
import { TemplatePreview } from '@/ui/templates/TemplatePreview';

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  básico: 'bg-success-soft text-success',
  intermedio: 'bg-warning-soft text-warning',
  avanzado: 'bg-danger-soft text-danger',
};

interface ExampleCatalogProps {
  module: DiagramModule;
  /** Qué significa cada nivel; al elegir uno, solo se ven sus ejemplos. */
  criteria?: DiagramGuide['difficultyCriteria'];
  onOpen: (template: Template) => void;
  /** Lleva a la tarjeta de un artefacto en la guía. */
  onShowArtifact: (type: string) => void;
}

/**
 * Ejemplos del diagrama: cada plantilla con su miniatura, lo que enseña (enlaces
 * a cada artefacto) y su narración paso a paso, que se despliega aquí mismo.
 */
export function ExampleCatalog({ module, criteria, onOpen, onShowArtifact }: ExampleCatalogProps) {
  const [readingId, setReadingId] = useState<string | null>(null);
  const [level, setLevel] = useState<Difficulty | null>(null);
  const templates = level ? module.templates.filter((template) => template.difficulty === level) : module.templates;

  return (
    <>
      {criteria && <DifficultyFilter criteria={criteria} templates={module.templates} value={level} onChange={setLevel} />}
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => {
          const reading = readingId === template.id;
          return (
            <article key={template.id} className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
              <div className="flex h-40 items-center justify-center border-b border-line bg-canvas">
                <TemplatePreview diagram={template.diagram} module={module} width={300} height={150} />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[15px] font-semibold text-ink-900">{template.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DIFFICULTY_STYLE[template.difficulty]}`}>
                    {template.difficulty}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{template.description}</p>

                <p className="mt-3 text-[11px] font-medium text-ink-400">Aprendes</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {template.learningGoals.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onShowArtifact(type)}
                      className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent hover:underline"
                    >
                      {module.artifacts.find((artifact) => artifact.type === type)?.name ?? type}
                    </button>
                  ))}
                </div>

                {reading && (
                  <ol className="mt-4 space-y-1 rounded-lg bg-canvas p-3 text-[13px] leading-relaxed text-ink-600">
                    {module.narrate(template.diagram).map((line, index) => (
                      <li key={index} style={{ paddingLeft: line.depth * 14 }} className={line.text.endsWith(':') ? 'font-medium text-ink-900' : ''}>
                        {line.text}
                      </li>
                    ))}
                  </ol>
                )}

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => onOpen(template)}
                    className="bg-brand flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
                    Abrir en el editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setReadingId(reading ? null : template.id)}
                    aria-expanded={reading}
                    className="flex items-center gap-2 rounded-md border border-line px-3.5 py-2 text-sm text-ink-900 hover:bg-raised"
                  >
                    {reading ? 'Ocultar narración' : 'Cómo funciona'}
                    <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform ${reading ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

/**
 * Los niveles de dificultad como filtro: clic en uno muestra solo sus ejemplos;
 * clic otra vez (o en «Ver todos») los muestra todos.
 */
function DifficultyFilter({
  criteria,
  templates,
  value,
  onChange,
}: {
  criteria: NonNullable<DiagramGuide['difficultyCriteria']>;
  templates: Template[];
  value: Difficulty | null;
  onChange: (level: Difficulty | null) => void;
}) {
  return (
    <div className="mb-5">
      <div role="radiogroup" aria-label="Filtrar ejemplos por dificultad" className="grid overflow-hidden rounded-lg border border-line bg-surface md:grid-cols-3">
        {criteria.map((level) => {
          const active = value === level.name;
          const count = templates.filter((template) => template.difficulty === level.name).length;
          return (
            <button
              key={level.name}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(active ? null : level.name)}
              className={`border-b border-line p-3.5 text-left transition-colors last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0 ${active ? 'bg-accent-soft' : 'hover:bg-raised'}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold capitalize ${active ? 'text-accent' : 'text-ink-900'}`}>{level.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DIFFICULTY_STYLE[level.name]}`}>
                  {count} {count === 1 ? 'ejemplo' : 'ejemplos'}
                </span>
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-600">{level.description}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex items-center gap-2 text-[11px] text-ink-400">
        {value ? (
          <>
            Mostrando solo los ejemplos de nivel {value}.
            <button type="button" onClick={() => onChange(null)} className="font-medium text-accent hover:underline">
              Ver todos
            </button>
          </>
        ) : (
          'Elige un nivel para ver solo sus ejemplos.'
        )}
      </p>
    </div>
  );
}
