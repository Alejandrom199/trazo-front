import { describe, expect, it } from 'vitest';
import { createRegistry } from '@/core/registry';
import { registerDiagramModules } from '@/diagrams';
import { edgeLook, newQuestion, type QuizQuestion } from './ArtifactQuiz';

const registry = createRegistry();
registerDiagramModules(registry);
const modules = registry.list().map((module) => ({ name: module.displayName, module }));

/** Muchas preguntas seguidas, como al pulsar «Otra»: las reglas deben cumplirse en todas. */
function ask(module: (typeof modules)[number]['module'], count = 300): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  let previous: QuizQuestion | undefined;
  for (let i = 0; i < count; i += 1) {
    previous = newQuestion(module, previous?.answer);
    questions.push(previous);
  }
  return questions;
}

describe('quiz de artefactos', () => {
  it.each(modules)('$name: cada pregunta incluye la respuesta, sin opciones repetidas ni de otra familia', ({ module }) => {
    for (const question of ask(module)) {
      const types = question.options.map((option) => option.type);
      expect(types).toContain(question.answer.type);
      expect(new Set(types).size).toBe(types.length);
      const kinds = question.family === 'edge' ? module.edgeKinds : module.nodeKinds;
      for (const type of types) expect(kinds[type]).toBeDefined();
    }
  });

  it.each(modules)('$name: en una relación, todas las opciones se ven distintas', ({ module }) => {
    for (const question of ask(module).filter((candidate) => candidate.family === 'edge')) {
      const looks = question.options.map((option) => edgeLook(module.edgeKinds[option.type]!));
      expect(new Set(looks).size).toBe(looks.length);
    }
  });

  it.each(modules)('$name: no repite la pregunta anterior', ({ module }) => {
    const questions = ask(module, 100);
    for (let i = 1; i < questions.length; i += 1) {
      if (questions[i]!.options.length > 1) expect(questions[i]!.answer.type).not.toBe(questions[i - 1]!.answer.type);
    }
  });

  it('Dado un diagrama con relaciones de aspectos distintos (clases), Entonces también pregunta por relaciones', () => {
    const classes = registry.get('class');
    expect(ask(classes).some((question) => question.family === 'edge')).toBe(true);
  });
});
