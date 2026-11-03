import { describe, expect, it } from 'vitest';
import type { Diagram } from '@/core/model';
import { resolveStateConnection } from './connections';
import { stateRules } from './rules';
import { createStateTemplateBuilder } from './templates/templateBuilder';

const issues = (diagram: Diagram) => stateRules.flatMap((rule) => rule.check(diagram)).map((issue) => issue.ruleId);
const build = (draw: (b: ReturnType<typeof createStateTemplateBuilder>) => void) => {
  const b = createStateTemplateBuilder();
  draw(b);
  return b.build({ id: 't', name: 't', description: '', difficulty: 'básico', learningGoals: [] }).diagram;
};

describe('conexiones de la máquina de estados', () => {
  it('Dado un estado inicial, Entonces nada puede llegar a él y solo tiene una salida', () => {
    const diagram = build((b) => {
      const start = b.initial({ x: 0, y: 0 });
      const a = b.state('A', { x: 100, y: 0 });
      b.state('B', { x: 300, y: 0 });
      b.connect(start, a);
    });
    const [start, a, bState] = diagram.nodes;
    expect(resolveStateConnection(diagram, a!.id, start!.id)).toMatchObject({ allowed: false });
    expect(resolveStateConnection(diagram, start!.id, bState!.id)).toMatchObject({ allowed: false });
  });

  it('Dados dos estados ya unidos, Entonces se admite la vuelta pero no otra en el mismo sentido', () => {
    const diagram = build((b) => {
      const a = b.state('A', { x: 0, y: 0 });
      const bState = b.state('B', { x: 300, y: 0 });
      b.connect(a, bState, 'ir');
    });
    const [a, bState] = diagram.nodes;
    expect(resolveStateConnection(diagram, bState!.id, a!.id)).toEqual({ allowed: true, edgeType: 'transition' });
    expect(resolveStateConnection(diagram, a!.id, bState!.id)).toMatchObject({ allowed: false });
  });
});

describe('reglas de la máquina de estados', () => {
  it('Dada una máquina sin estado inicial, Entonces lo exige', () => {
    expect(issues(build((b) => void b.state('A', { x: 0, y: 0 })))).toContain('state.missing-initial');
  });

  it('Dado un estado al que no llega ninguna transición, Entonces es inalcanzable', () => {
    const diagram = build((b) => {
      b.connect(b.initial({ x: 0, y: 0 }), b.state('A', { x: 100, y: 0 }));
      b.state('Huérfano', { x: 400, y: 0 });
    });
    expect(issues(diagram)).toContain('state.unreachable');
  });

  it('Dado un subestado alcanzable por el inicial de su estado compuesto, Entonces no es inalcanzable', () => {
    const diagram = build((b) => {
      const outer = b.composite('C', { x: 200, y: 0 }, { width: 400, height: 200 });
      b.connect(b.initial({ x: 0, y: 0 }), outer, 'entrar');
      b.connect(b.initial({ x: 20, y: 80 }, outer), b.state('Dentro', { x: 100, y: 70 }, outer));
    });
    expect(issues(diagram)).not.toContain('state.unreachable');
  });

  it('Dado un estado sin salidas cuyo compuesto sí tiene, Entonces no es un callejón sin salida', () => {
    const diagram = build((b) => {
      const outer = b.composite('C', { x: 200, y: 0 }, { width: 400, height: 200 });
      b.connect(b.initial({ x: 0, y: 0 }), outer, 'entrar');
      b.connect(b.initial({ x: 20, y: 80 }, outer), b.state('Dentro', { x: 100, y: 70 }, outer));
      b.connect(outer, b.final({ x: 800, y: 0 }), 'cancelar');
    });
    expect(issues(diagram)).not.toContain('state.dead-end');
  });

  it('Dada una elección con una salida sin guarda, Entonces la señala', () => {
    const diagram = build((b) => {
      const a = b.state('A', { x: 100, y: 0 });
      const choice = b.choice({ x: 300, y: 10 });
      b.connect(b.initial({ x: 0, y: 0 }), a);
      b.connect(a, choice, 'evaluar');
      b.connect(choice, b.state('Sí', { x: 500, y: 0 }), '[ok]');
      b.connect(choice, b.state('No', { x: 500, y: 200 }), 'falla');
    });
    expect(issues(diagram)).toContain('state.choice-guards');
  });

  it('Dada una transición sin evento que no sale de un pseudoestado, Entonces lo informa', () => {
    const diagram = build((b) => {
      const a = b.state('A', { x: 100, y: 0 });
      b.connect(b.initial({ x: 0, y: 0 }), a);
      b.connect(a, b.final({ x: 400, y: 0 }));
    });
    expect(issues(diagram)).toEqual(['state.transition-without-event']);
  });
});
