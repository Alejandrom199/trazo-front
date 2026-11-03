import { describe, expect, it } from 'vitest';
import type { Diagram } from '@/core/model';
import { resolveStateConnection } from './connections';
import { stateRules } from './rules';
import { stateTemplates } from './templates';
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

  it('Dada una transición sin evento entre dos estados, Entonces lo informa', () => {
    const diagram = build((b) => {
      const a = b.state('A', { x: 100, y: 0 });
      const other = b.state('B', { x: 400, y: 0 });
      b.connect(b.initial({ x: 0, y: 0 }), a);
      b.connect(a, other);
      b.connect(other, b.final({ x: 700, y: 0 }), 'cerrar');
    });
    expect(issues(diagram)).toEqual(['state.transition-without-event']);
  });

  it('Dada una transición sin evento hacia el estado final, Entonces no avisa (es de finalización)', () => {
    const diagram = build((b) => {
      const a = b.state('A', { x: 100, y: 0 });
      b.connect(b.initial({ x: 0, y: 0 }), a);
      b.connect(a, b.final({ x: 400, y: 0 }));
    });
    expect(issues(diagram)).toEqual([]);
  });
});

describe('ejemplos de máquina de estados', () => {
  it.each(stateTemplates)('$name: no tiene problemas', (template) => {
    expect(stateRules.flatMap((rule) => rule.check(template.diagram)).map((issue) => issue.message)).toEqual([]);
  });
});

describe('correcciones de un clic', () => {
  let next = 0;
  const createId = () => `fix${++next}`;
  const fixAll = (diagram: Diagram, ruleId: string) =>
    stateRules
      .flatMap((rule) => rule.check(diagram))
      .filter((issue) => issue.ruleId === ruleId)
      .reduce((current, issue) => issue.fix!.apply(current, createId), diagram);

  it('Dada una máquina sin estado inicial, Entonces «Arreglar» lo agrega unido al primer estado', () => {
    const fixed = fixAll(build((b) => void b.state('A', { x: 200, y: 0 })), 'state.missing-initial');
    expect(issues(fixed)).not.toContain('state.missing-initial');
    expect(fixed.edges).toHaveLength(1);
  });

  it('Dada una elección con salidas sin guarda, Entonces «Arreglar» pone [condición] y [else]', () => {
    const diagram = build((b) => {
      const a = b.state('A', { x: 100, y: 0 });
      const choice = b.choice({ x: 300, y: 10 });
      b.connect(b.initial({ x: 0, y: 0 }), a);
      b.connect(a, choice, 'evaluar');
      b.connect(choice, b.state('Sí', { x: 500, y: 0 }));
      b.connect(choice, b.state('No', { x: 500, y: 200 }));
    });
    const fixed = fixAll(diagram, 'state.choice-guards');
    expect(issues(fixed)).not.toContain('state.choice-guards');
    expect(fixed.edges.slice(-2).map((edge) => edge.label)).toEqual(['[condición]', '[else]']);
  });

  it('Dada una nota suelta, Entonces «Arreglar» la ancla al elemento más cercano', () => {
    const diagram = build((b) => {
      b.connect(b.initial({ x: 0, y: 0 }), b.state('A', { x: 100, y: 0 }));
      b.note('Ojo', { x: 100, y: 150 });
    });
    const fixed = fixAll(diagram, 'state.note-loose');
    expect(issues(fixed)).not.toContain('state.note-loose');
    expect(fixed.edges.at(-1)).toMatchObject({ artifactType: 'annotationLink', targetId: fixed.nodes[1]!.id });
  });

  it('Dado un estado sin salidas, Entonces «Arreglar» lo lleva a un estado final', () => {
    const diagram = build((b) => void b.connect(b.initial({ x: 0, y: 0 }), b.state('A', { x: 100, y: 0 })));
    const fixed = fixAll(diagram, 'state.dead-end');
    expect(issues(fixed)).toEqual([]);
  });
});
