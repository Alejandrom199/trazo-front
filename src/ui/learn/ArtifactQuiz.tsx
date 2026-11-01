import { faCheck, faRotateRight, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useState } from 'react';
import type { ArtifactDefinition } from '@/core/model';
import type { DiagramModule } from '@/core/registry';
import { ArtifactFigure } from '@/ui/artifacts/ArtifactFigure';

const OPTIONS = 3;

interface Question {
  answer: ArtifactDefinition;
  options: ArtifactDefinition[];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function newQuestion(module: DiagramModule, previous?: ArtifactDefinition): Question {
  const drawable = module.artifacts.filter((artifact) => module.nodeKinds[artifact.type] && artifact.type !== previous?.type);
  const [answer, ...others] = shuffle(drawable);
  return { answer: answer!, options: shuffle([answer!, ...others.slice(0, OPTIONS - 1)]) };
}

/** "Ponte a prueba": muestra una figura y pide reconocer qué artefacto es. */
export function ArtifactQuiz({ module }: { module: DiagramModule }) {
  const [question, setQuestion] = useState(() => newQuestion(module));
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const next = useCallback(() => {
    setQuestion((current) => newQuestion(module, current.answer));
    setPicked(null);
  }, [module]);

  function pick(type: string) {
    if (picked) return;
    setPicked(type);
    setScore((current) => ({ right: current.right + (type === question.answer.type ? 1 : 0), total: current.total + 1 }));
  }

  const kind = module.nodeKinds[question.answer.type]!;
  const isRight = picked === question.answer.type;

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-900">¿Qué artefacto es este?</p>
        <span className="text-xs text-ink-400 tabular-nums">
          {score.right} de {score.total} aciertos
        </span>
      </div>

      <div className="mt-4 flex h-32 items-center justify-center rounded-lg bg-canvas">
        <ArtifactFigure kind={kind} artifactType={question.answer.type} box={{ width: 170, height: 90 }} />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {question.options.map((option) => {
          const state = !picked
            ? 'idle'
            : option.type === question.answer.type
              ? 'right'
              : option.type === picked
                ? 'wrong'
                : 'idle';
          return (
            <button
              key={option.type}
              type="button"
              onClick={() => pick(option.type)}
              disabled={picked !== null}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                state === 'right'
                  ? 'border-success bg-success-soft font-medium text-success'
                  : state === 'wrong'
                    ? 'border-danger bg-danger-soft text-danger'
                    : 'border-line text-ink-900 enabled:hover:border-accent/50 enabled:hover:bg-accent-soft'
              }`}
            >
              {state === 'right' && <FontAwesomeIcon icon={faCheck} className="text-xs" />}
              {state === 'wrong' && <FontAwesomeIcon icon={faXmark} className="text-xs" />}
              {option.name}
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg bg-canvas p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm leading-relaxed text-ink-600">
            <span className={`font-medium ${isRight ? 'text-success' : 'text-danger'}`}>{isRight ? '¡Correcto! ' : 'No es ese. '}</span>
            Es un <span className="font-medium text-ink-900">{question.answer.name}</span>: {question.answer.whatIs}
          </p>
          <button
            type="button"
            onClick={next}
            className="bg-brand flex shrink-0 items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
            Otra
          </button>
        </div>
      )}
    </div>
  );
}
