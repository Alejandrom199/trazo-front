import { describe, expect, it } from 'vitest';
import { REQUIREMENT_KINDS } from './requirements';
import { LESSON_OF_KIND, SPEC_EXERCISES, SPEC_LESSONS } from './specificationLessons';

describe('lección de requisitos y casos de uso', () => {
  it('Dadas sus partes, Entonces cada una tiene un ancla distinta y cada tipo de requisito su parte', () => {
    const ids = SPEC_LESSONS.map((lesson) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const kind of REQUIREMENT_KINDS) expect(ids).toContain(LESSON_OF_KIND[kind.id]);
  });

  it('Dados los ejercicios, Entonces cada uno tiene una sola respuesta correcta y todas explican por qué', () => {
    for (const exercise of SPEC_EXERCISES) {
      expect(exercise.options.filter((option) => option.correct)).toHaveLength(1);
      expect(exercise.options.every((option) => option.explanation.trim().length > 0)).toBe(true);
    }
  });
});
