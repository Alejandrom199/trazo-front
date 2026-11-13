import { faCheck, faRotateRight, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useState } from 'react';
import type { ArtifactDefinition } from '@/core/model';
import type { DiagramModule, EdgeKind } from '@/core/registry';
import { ArtifactFigure } from '@/ui/artifacts/ArtifactFigure';
import { EdgeFigure } from '@/ui/artifacts/EdgeFigure';
import { readQuizScore, writeQuizScore } from './learningProgress';

const OPTIONS = 3;

/** Se pregunta por figuras (nodos) y por relaciones (conexiones); las opciones son de la misma familia. */
type Family = 'node' | 'edge';

export interface QuizQuestion {
  answer: ArtifactDefinition;
  family: Family;
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

function familyOf(module: DiagramModule, type: string): Family | null {
  if (module.nodeKinds[type]) return 'node';
  return module.edgeKinds[type] ? 'edge' : null;
}

/** Cómo se ve una relación en su figura: dos con el mismo aspecto no se distinguen a simple vista. */
export const edgeLook = (kind: EdgeKind) => `${kind.dashed ? 'discontinua' : 'continua'}|${kind.arrow ?? 'sin punta'}|${kind.sourceMarker ?? 'sin rombo'}`;

/**
 * Opciones incorrectas para `answer`, de su misma familia. En relaciones, cada una
 * con un aspecto distinto al de la respuesta y al de las demás: si no, la pregunta
 * tendría dos respuestas iguales a la vista (p. ej. «include» y «extend»).
 */
function distractorsFor(module: DiagramModule, answer: ArtifactDefinition, family: Family): ArtifactDefinition[] {
  const sameFamily = shuffle(module.artifacts.filter((artifact) => artifact.type !== answer.type && familyOf(module, artifact.type) === family));
  if (family === 'node') return sameFamily.slice(0, OPTIONS - 1);
  const seen = new Set([edgeLook(module.edgeKinds[answer.type]!)]);
  return sameFamily
    .filter((artifact) => {
      const look = edgeLook(module.edgeKinds[artifact.type]!);
      if (seen.has(look)) return false;
      seen.add(look);
      return true;
    })
    .slice(0, OPTIONS - 1);
}

/** Una pregunta nueva, distinta de la anterior. Solo se pregunta lo que tiene al menos una opción incorrecta. */
export function newQuestion(module: DiagramModule, previous?: ArtifactDefinition): QuizQuestion {
  const candidates = shuffle(module.artifacts.filter((artifact) => artifact.type !== previous?.type && familyOf(module, artifact.type)));
  for (const answer of candidates) {
    const family = familyOf(module, answer.type)!;
    const distractors = distractorsFor(module, answer, family);
    if (distractors.length > 0) return { answer, family, options: shuffle([answer, ...distractors]) };
  }
  // Un diagrama con un solo artefacto dibujable: la pregunta solo puede tener esa opción.
  const answer = candidates[0] ?? module.artifacts[0]!;
  return { answer, family: familyOf(module, answer.type) ?? 'node', options: [answer] };
}

/** "Ponte a prueba": muestra una figura y pide reconocer qué artefacto es. */
export function ArtifactQuiz({ module }: { module: DiagramModule }) {
  const [question, setQuestion] = useState(() => newQuestion(module));
  const [picked, setPicked] = useState<string | null>(null);
  // Los aciertos se guardan por tipo de diagrama: se conservan al volver a la guía.
  const [score, setScore] = useState(() => readQuizScore(module.diagramType));

  const next = useCallback(() => {
    setQuestion((current) => newQuestion(module, current.answer));
    setPicked(null);
  }, [module]);

  function pick(type: string) {
    if (picked) return;
    setPicked(type);
    const next = { right: score.right + (type === question.answer.type ? 1 : 0), total: score.total + 1 };
    setScore(next);
    writeQuizScore(module.diagramType, next);
  }

  const isRight = picked === question.answer.type;
  const isRelation = question.family === 'edge';

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-900">{isRelation ? '¿Qué relación es esta?' : '¿Qué artefacto es este?'}</p>
        <span className="text-xs text-ink-400 tabular-nums">
          {score.right} de {score.total} aciertos
        </span>
      </div>

      <div className="mt-4 flex h-32 items-center justify-center rounded-lg bg-canvas">
        {isRelation ? (
          // EdgeFigure limita el rombo y la punta a ~12 px: se dibuja corta y se escala, para que
          // se distinga lo que se pregunta (rombo hueco o relleno, punta abierta o cerrada).
          <div className="scale-[1.8]">
            <EdgeFigure kind={module.edgeKinds[question.answer.type]} box={{ width: 100, height: 36 }} />
          </div>
        ) : (
          <ArtifactFigure kind={module.nodeKinds[question.answer.type]!} artifactType={question.answer.type} box={{ width: 170, height: 90 }} />
        )}
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
