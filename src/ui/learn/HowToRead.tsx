import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import type { DiagramModule } from '@/core/registry';
import { ArtifactFigure } from '@/ui/artifacts/ArtifactFigure';

/** "Cómo leerlo": pasos numerados; el elegido muestra sus artefactos con la figura real. */
export function HowToRead({ module }: { module: DiagramModule }) {
  const steps = module.guide.howToRead;
  const [current, setCurrent] = useState(0);
  const step = steps[current];
  if (!step) return null;

  const figures = step.artifactTypes
    .map((type) => ({ definition: module.artifacts.find((artifact) => artifact.type === type), kind: module.nodeKinds[type] }))
    .filter((entry) => entry.definition);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <ol className="flex flex-col gap-1" role="tablist" aria-label="Pasos para leer el diagrama">
        {steps.map((entry, index) => (
          <li key={entry.title}>
            <button
              type="button"
              role="tab"
              aria-selected={index === current}
              onClick={() => setCurrent(index)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                index === current ? 'bg-accent-soft font-medium text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'
              }`}
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  index === current ? 'bg-brand text-white' : 'bg-raised text-ink-400'
                }`}
              >
                {index + 1}
              </span>
              {entry.title}
            </button>
          </li>
        ))}
      </ol>

      <div role="tabpanel" className="flex flex-col rounded-xl border border-line bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          Paso {current + 1} de {steps.length}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-ink-900">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">{step.text}</p>

        <div className="mt-5 flex flex-wrap gap-3">
          {figures.map(({ definition, kind }) => (
            <div key={definition!.type} className="flex min-w-28 flex-1 flex-col items-center gap-2 rounded-lg bg-canvas px-3 py-4">
              {kind ? (
                <ArtifactFigure kind={kind} artifactType={definition!.type} box={{ width: 110, height: 56 }} />
              ) : (
                <EdgeSample dashed={module.edgeKinds[definition!.type]?.dashed ?? false} />
              )}
              <span className="text-center text-xs font-medium text-ink-900">{definition!.name}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto flex justify-between pt-5">
          <button
            type="button"
            onClick={() => setCurrent(current - 1)}
            disabled={current === 0}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-ink-600 hover:bg-raised disabled:opacity-35"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-xs" /> Anterior
          </button>
          <button
            type="button"
            onClick={() => setCurrent(current + 1)}
            disabled={current === steps.length - 1}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-accent hover:bg-accent-soft disabled:opacity-35"
          >
            Siguiente <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Muestra de una conexión (no tiene figura de nodo). */
export function EdgeSample({ dashed }: { dashed: boolean }) {
  return (
    <svg width={110} height={56} aria-hidden>
      <defs>
        <marker id="guide-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" style={{ fill: 'var(--color-edge)' }} />
        </marker>
      </defs>
      <line
        x1={12}
        y1={28}
        x2={98}
        y2={28}
        strokeWidth={1.5}
        strokeDasharray={dashed ? '5 4' : undefined}
        markerEnd={dashed ? undefined : 'url(#guide-arrow)'}
        style={{ stroke: 'var(--color-edge)' }}
      />
    </svg>
  );
}
