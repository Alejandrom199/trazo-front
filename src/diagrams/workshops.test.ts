import { describe, expect, it } from 'vitest';
import { validateDiagram } from '@/core/model';
import { createRegistry, type LearningOption } from '@/core/registry';
import { registerDiagramModules } from '.';

/**
 * Los talleres de Aprender son contenido: estas pruebas evitan que un reto prometa
 * problemas que el editor no detecta o que una pregunta tenga dos respuestas buenas.
 */
const registry = createRegistry();
registerDiagramModules(registry);
const withWorkshop = registry
  .list()
  .filter((module) => module.guide.workshop)
  .map((module) => ({ name: module.displayName, module, workshop: module.guide.workshop! }));

const oneCorrect = (options: LearningOption[]) => options.filter((option) => option.correct).length;

describe('talleres de Aprender', () => {
  it('Los diagramas principales tienen taller', () => {
    const main = ['class', 'activity', 'sequence', 'state', 'component', 'deployment', 'package', 'usecase'];
    expect(main.filter((type) => !registry.get(type as never).guide.workshop)).toEqual([]);
  });

  it.each(withWorkshop)('$name: cada reto anuncia exactamente los problemas que detecta el editor', ({ module, workshop }) => {
    for (const challenge of workshop.correctionChallenges) {
      expect(challenge.diagram.diagramType).toBe(module.diagramType);
      expect(validateDiagram(challenge.diagram.diagram, module.rules).map((issue) => issue.ruleId)).toHaveLength(challenge.expectedProblems);
    }
  });

  it.each(withWorkshop)('$name: cada pregunta y comparación tiene una sola respuesta correcta', ({ workshop }) => {
    const questions = [
      ...workshop.correctionChallenges.map((challenge) => challenge.question),
      ...workshop.briefExercises.flatMap((exercise) => exercise.questions),
    ];
    for (const question of questions) expect(oneCorrect(question.options)).toBe(1);
    for (const comparison of workshop.comparisons) expect(oneCorrect(comparison.options)).toBe(1);
  });

  it.each(withWorkshop)('$name: los ids del taller no se repiten (el progreso se guarda por id)', ({ workshop }) => {
    const ids = [
      ...workshop.correctionChallenges.map((challenge) => challenge.id),
      ...workshop.briefExercises.flatMap((exercise) => exercise.questions.map((question) => `${exercise.id}:${question.id}`)),
      ...workshop.comparisons.map((comparison) => comparison.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
