import { describe, expect, it } from 'vitest';
import { answersMatch, normalizeAnswer, suggestExit, type WalkFact } from './walkMemory';

const exits = [{ edgeId: 'yes', guard: 'disponible' }, { edgeId: 'no', guard: 'no disponible' }];
const fact = (question: string, answer: string, nodeId = 'd1'): WalkFact => ({ question, answer, nodeId, diagramName: 'Validar' });

describe('memoria del recorrido', () => {
  it('Dados textos con tildes, corchetes, mayúsculas o sinónimos de sí/no, Entonces coinciden', () => {
    expect(normalizeAnswer('[No  disponible]')).toBe('no disponible');
    expect(answersMatch('Sí', 'si')).toBe(true);
    expect(answersMatch('yes', 'SÍ')).toBe(true);
    expect(answersMatch('no', 'falso')).toBe(true);
    expect(answersMatch('disponible', 'no disponible')).toBe(false);
    expect(answersMatch('', '')).toBe(false);
  });

  it('Dado el resultado de un subproceso, Entonces sugiere la salida con esa guarda (R2)', () => {
    const outcome = { label: 'No disponible', from: 'final' as const, diagramName: 'Validar' };
    expect(suggestExit('¿Disponible?', 'p1', exits, outcome, [])?.edgeId).toBe('no');
  });

  it('Dado un resultado que ninguna guarda nombra, Entonces sugiere [else] si existe y si no, nada', () => {
    const outcome = { label: 'error de red', from: 'final' as const, diagramName: 'Validar' };
    expect(suggestExit('¿Ok?', 'p1', [{ edgeId: 'a', guard: 'ok' }, { edgeId: 'b', guard: 'else' }], outcome, [])?.edgeId).toBe('b');
    expect(suggestExit('¿Ok?', 'p1', exits, outcome, [])).toBeNull();
  });

  it('Dada la misma pregunta ya respondida en otra decisión, Entonces sugiere esa respuesta (R3)', () => {
    const suggestion = suggestExit('¿Hay ejemplares libres?', 'p1', [{ edgeId: 's', guard: 'sí' }, { edgeId: 'n', guard: 'no' }], null, [fact('¿Hay ejemplares libres?', 'no')]);
    expect(suggestion?.edgeId).toBe('n');
    expect(suggestion?.reason).toContain('Validar');
  });

  it('Dada la misma decisión vuelta a visitar (un bucle), Entonces no sugiere: se pregunta de nuevo', () => {
    expect(suggestExit('¿Datos válidos?', 'd1', [{ edgeId: 's', guard: 'sí' }, { edgeId: 'n', guard: 'no' }], null, [fact('¿Datos válidos?', 'no', 'd1')])).toBeNull();
  });
});
