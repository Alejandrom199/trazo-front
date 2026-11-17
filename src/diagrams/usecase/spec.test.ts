import { describe, expect, it } from 'vitest';
import { UseCaseArtifact as U } from './artifactTypes';
import { emptySpec, nextUseCaseCode, readSpec, reviewSpec, useCaseContext, withSpec } from './spec';
import { createUseCaseTemplateBuilder } from './templates/templateBuilder';

const info = { id: 't', name: 't', description: '', difficulty: 'básico' as const, learningGoals: [] };

describe('ficha de caso de uso', () => {
  it('Dado un caso con actor, inclusión y extensión, Entonces la ficha lee todo eso del diagrama', () => {
    const b = createUseCaseTemplateBuilder();
    const boundary = b.boundary('Sistema', { x: 0, y: 0 });
    const user = b.actor('Usuario', { x: -200, y: 50 });
    const register = b.useCase('Registrar mascota', { x: 50, y: 50 }, boundary);
    const validate = b.useCase('Validar cliente', { x: 50, y: 200 }, boundary);
    const photo = b.useCase('Adjuntar foto', { x: 300, y: 50 }, boundary);
    b.relation(user, register);
    b.relation(register, validate, U.include);
    b.relation(photo, register, U.extend);
    const diagram = b.build(info).diagram;

    expect(useCaseContext(diagram, register)).toEqual({ actors: ['Usuario'], includes: ['Validar cliente'], extendedBy: ['Adjuntar foto'], extends: [] });
  });

  it('Dadas fichas con código, Entonces el siguiente sigue la numeración y la ficha se guarda y se lee del nodo', () => {
    const b = createUseCaseTemplateBuilder();
    const boundary = b.boundary('Sistema', { x: 0, y: 0 });
    const first = b.useCase('Uno', { x: 50, y: 50 }, boundary);
    let diagram = b.build(info).diagram;
    diagram = { ...diagram, nodes: diagram.nodes.map((node) => (node.id === first ? { ...node, props: withSpec(node.props, emptySpec('CU07')) } : node)) };

    expect(nextUseCaseCode([diagram])).toBe('CU08');
    expect(readSpec(diagram.nodes.find((node) => node.id === first)!)?.code).toBe('CU07');
  });

  it('Dada una ficha vacía sin actores, Entonces el revisor pide lo esencial; completa, solo consejos menores', () => {
    const empty = reviewSpec(emptySpec('CU01'), { actors: [], includes: [], extendedBy: [], extends: [] }, 0);
    expect(empty.filter((hint) => hint.level === 'warning').map((hint) => hint.text)).toEqual([
      'El caso no tiene actores: únelo en el diagrama con quien lo inicia.',
      'Falta el propósito: para qué lo hace el actor.',
      'El curso típico necesita al menos una acción del actor y una respuesta del sistema.',
      'Falta la postcondición: cómo queda el sistema cuando el caso termina bien.',
    ]);

    const complete = {
      ...emptySpec('CU01'),
      purpose: 'Registrar una mascota asociada a un cliente.',
      summary: 'El usuario ingresa los datos y quedan guardados.',
      preconditions: ['El usuario inició sesión.'],
      postconditions: ['La mascota queda guardada.'],
      typicalCourse: [{ by: 'actor' as const, text: 'Selecciona «Registrar mascota».' }, { by: 'system' as const, text: 'Muestra el formulario.' }],
      alternateCourses: [{ step: 2, text: 'Si falta un dato, muestra un error.' }],
    };
    expect(reviewSpec(complete, { actors: ['Usuario'], includes: [], extendedBy: [], extends: [] }, 1)).toEqual([]);
  });
});
