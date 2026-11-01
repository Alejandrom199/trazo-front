import { faArrowUpRightFromSquare, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import type { Difficulty, Template } from '@/core/model';
import type { DiagramModule } from '@/core/registry';
import { TemplatePreview } from '@/ui/templates/TemplatePreview';

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  básico: 'bg-success-soft text-success',
  intermedio: 'bg-warning-soft text-warning',
  avanzado: 'bg-danger-soft text-danger',
};

interface ExampleCatalogProps {
  module: DiagramModule;
  onOpen: (template: Template) => void;
  /** Lleva a la tarjeta de un artefacto en la guía. */
  onShowArtifact: (type: string) => void;
}

/**
 * Ejemplos del diagrama: cada plantilla con su miniatura, lo que enseña (enlaces
 * a cada artefacto) y su narración paso a paso, que se despliega aquí mismo.
 */
export function ExampleCatalog({ module, onOpen, onShowArtifact }: ExampleCatalogProps) {
  const [readingId, setReadingId] = useState<string | null>(null);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {module.templates.map((template) => {
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
  );
}
