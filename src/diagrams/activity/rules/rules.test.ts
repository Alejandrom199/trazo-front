import { describe, expect, it } from 'vitest';
import { createEmptyDiagram, validateDiagram, type Diagram, type ValidationRule } from '@/core/model';
import { ActivityArtifact as A } from '../artifactTypes';
import { activityTemplates } from '../templates';
import { createTemplateBuilder } from '../templates/templateBuilder';
import { nodeIsolated, nodeUnreachable, noteUnanchored } from './connectivityRules';
import { forkWithoutJoin, joinUsedAsMerge, joinWithoutFork, mergeUsedAsJoin } from './concurrencyRules';
import { decisionGuardDuplicate, decisionGuardMissing, decisionOutgoing } from './decisionRules';
import { activityRules } from '.';
import { actionNotVerb, actionUnnamed, startsWithInfinitive } from './namingRules';
import { finalMissing, initialMissing, initialMultiple } from './structureRules';

/**
 * Arma diagramas de prueba con el mismo constructor de las plantillas: las flechas
 * pasan por la regla de conexión real. Cada nodo se coloca en su propia fila.
 */
function sketch(draw: (put: (type: string, label?: string) => string, t: ReturnType<typeof createTemplateBuilder>) => void): Diagram {
  const t = createTemplateBuilder();
  let row = 0;
  const put = (type: string, label = '') => t.node(type, label, { x: 300, y: 100 * ++row });
  draw(put, t);
  return t.build({ id: 'test', name: 'test', description: '', difficulty: 'básico', learningGoals: [] }).diagram;
}

const ruleIds = (rule: ValidationRule, diagram: Diagram) => rule.check(diagram).map((issue) => issue.ruleId);

/** Proceso mínimo correcto: inicio → acción → fin. */
const minimal = sketch((put, t) => {
  const start = put(A.initialNode);
  const act = put(A.action, 'Pagar pedido');
  const end = put(A.activityFinal);
  t.flow(start, act);
  t.flow(act, end);
});

describe('motor de validación', () => {
  it('Dado un lienzo vacío, Entonces no reporta nada', () => {
    expect(validateDiagram(createEmptyDiagram({ diagramType: 'activity', name: 'x' }), activityRules)).toEqual([]);
  });

  it('Dado un proceso mínimo correcto, Entonces no reporta nada', () => {
    expect(validateDiagram(minimal, activityRules)).toEqual([]);
  });

  it('Ordena por gravedad: errores, advertencias, información', () => {
    const diagram = sketch((put) => {
      put(A.action, 'pago');
    });

    const severities = validateDiagram(diagram, activityRules).map((issue) => issue.severity);

    expect(severities).toEqual([...severities].sort((a, b) => ['error', 'warning', 'info'].indexOf(a) - ['error', 'warning', 'info'].indexOf(b)));
    expect(severities[0]).toBe('error');
  });

  it.each(activityTemplates)('La plantilla «$name» no tiene errores ni advertencias', (template) => {
    const serious = validateDiagram(template.diagram, activityRules).filter((issue) => issue.severity !== 'info');

    expect(serious).toEqual([]);
  });
});

describe('nodo inicial', () => {
  it('Dado un proceso sin nodo inicial, Entonces es un error', () => {
    const diagram = sketch((put) => {
      put(A.action, 'Pagar');
    });

    expect(ruleIds(initialMissing, diagram)).toEqual(['activity.initial-missing']);
  });

  it('Dados dos nodos iniciales, Entonces advierte y señala ambos', () => {
    const diagram = sketch((put) => {
      put(A.initialNode);
      put(A.initialNode);
    });

    expect(initialMultiple.check(diagram)[0]?.nodeIds).toHaveLength(2);
  });
});

describe('nodo final', () => {
  it('Dado un proceso sin ningún final, Entonces advierte', () => {
    const diagram = sketch((put, t) => t.flow(put(A.initialNode), put(A.action, 'Pagar')));

    expect(ruleIds(finalMissing, diagram)).toEqual(['activity.final-missing']);
  });

  it('Dado un proceso que solo termina en finales de flujo, Entonces lo acepta', () => {
    const diagram = sketch((put, t) => t.flow(put(A.initialNode), put(A.flowFinal)));

    expect(finalMissing.check(diagram)).toEqual([]);
  });
});

describe('conectividad', () => {
  it('Dado un nodo suelto, Entonces advierte que no está conectado', () => {
    const diagram = sketch((put, t) => {
      t.flow(put(A.initialNode), put(A.activityFinal));
      put(A.action, 'Olvidado');
    });

    expect(nodeIsolated.check(diagram)[0]?.message).toContain('«Olvidado»');
  });

  it('Dada una isla conectada a la que no llega el inicio, Entonces advierte por cada nodo inalcanzable', () => {
    const diagram = sketch((put, t) => {
      t.flow(put(A.initialNode), put(A.activityFinal));
      t.flow(put(A.action, 'Isla A'), put(A.action, 'Isla B'));
    });

    expect(nodeUnreachable.check(diagram)).toHaveLength(2);
  });

  it('Dada una aceptación de evento sin entrada, Entonces es un punto de inicio válido y lo que sigue es alcanzable', () => {
    const diagram = sketch((put, t) => {
      t.flow(put(A.initialNode), put(A.activityFinal));
      t.flow(put(A.acceptEvent, 'Solicitud recibida'), put(A.action, 'Revisar solicitud'));
    });

    expect(nodeUnreachable.check(diagram)).toEqual([]);
  });

  it('Dada una nota sin anclar, Entonces informa; anclada, no', () => {
    const loose = sketch((put, t) => {
      t.flow(put(A.initialNode), put(A.activityFinal));
      put(A.note, 'Ojo');
    });
    const anchored = sketch((put, t) => {
      const start = put(A.initialNode);
      t.flow(start, put(A.activityFinal));
      t.flow(put(A.note, 'Ojo'), start);
    });

    expect(ruleIds(noteUnanchored, loose)).toEqual(['activity.note-unanchored']);
    expect(noteUnanchored.check(anchored)).toEqual([]);
  });
});

describe('decisiones', () => {
  function decisionWith(guards: (string | null)[]): Diagram {
    return sketch((put, t) => {
      const decision = put(A.decision);
      t.flow(put(A.initialNode), decision);
      for (const guard of guards) t.flow(decision, put(A.activityFinal), guard);
    });
  }

  it('Dada una decisión con una sola salida, Entonces es un error', () => {
    expect(ruleIds(decisionOutgoing, decisionWith(['ok']))).toEqual(['activity.decision-outgoing']);
  });

  it('Dada una salida sin guarda, Entonces advierte y señala esa flecha', () => {
    const issues = decisionGuardMissing.check(decisionWith(['ok', null]));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.edgeIds).toHaveLength(1);
  });

  it('Dadas guardas iguales salvo mayúsculas y espacios, Entonces son duplicadas', () => {
    expect(ruleIds(decisionGuardDuplicate, decisionWith(['Pago OK', ' pago  ok ']))).toEqual(['activity.decision-guard-duplicate']);
  });

  it('Dadas guardas distintas, Entonces no hay problemas de decisión', () => {
    const diagram = decisionWith(['aprobado', 'else']);

    expect([...decisionOutgoing.check(diagram), ...decisionGuardMissing.check(diagram), ...decisionGuardDuplicate.check(diagram)]).toEqual([]);
  });
});

describe('concurrencia', () => {
  it('Dado un fork cuyas ramas nunca llegan a un join, Entonces advierte', () => {
    const diagram = sketch((put, t) => {
      const fork = put(A.fork);
      t.flow(put(A.initialNode), fork);
      t.flow(fork, put(A.activityFinal));
      t.flow(fork, put(A.flowFinal));
    });

    expect(ruleIds(forkWithoutJoin, diagram)).toEqual(['activity.fork-without-join']);
  });

  it('Dado un join sin fork antes, Entonces advierte', () => {
    const diagram = sketch((put, t) => {
      const join = put(A.join);
      t.flow(put(A.initialNode), join);
      t.flow(put(A.action, 'Otra cosa'), join);
      t.flow(join, put(A.activityFinal));
    });

    expect(ruleIds(joinWithoutFork, diagram)).toEqual(['activity.join-without-fork']);
  });

  it('Dada una fusión que recibe dos ramas de un fork, Entonces es un error (fusión usada como join)', () => {
    let forkId = '';
    const diagram = sketch((put, t) => {
      forkId = put(A.fork);
      const merge = put(A.merge);
      const charge = put(A.action, 'Cobrar');
      const pack = put(A.action, 'Empacar');
      t.flow(put(A.initialNode), forkId);
      t.flow(forkId, charge);
      t.flow(forkId, pack);
      t.flow(charge, merge);
      t.flow(pack, merge);
      t.flow(merge, put(A.activityFinal));
    });

    const issue = mergeUsedAsJoin.check(diagram)[0];
    expect(issue?.ruleId).toBe('activity.merge-used-as-join');
    expect(issue?.nodeIds).toContain(forkId);
  });

  it('Dada una decisión DENTRO de una rama de fork cuyas salidas se reúnen en una fusión, Entonces no es un error', () => {
    const diagram = sketch((put, t) => {
      const fork = put(A.fork);
      const decision = put(A.decision);
      const merge = put(A.merge);
      const join = put(A.join);
      const otherBranch = put(A.action, 'Otra rama');
      const yes = put(A.action, 'Camino sí');
      const no = put(A.action, 'Camino no');
      t.flow(put(A.initialNode), fork);
      t.flow(fork, decision);
      t.flow(fork, otherBranch);
      t.flow(decision, yes, 'sí');
      t.flow(decision, no, 'no');
      t.flow(yes, merge);
      t.flow(no, merge);
      t.flow(merge, join);
      t.flow(otherBranch, join);
      t.flow(join, put(A.activityFinal));
    });

    expect(mergeUsedAsJoin.check(diagram)).toEqual([]);
    expect(joinUsedAsMerge.check(diagram)).toEqual([]);
  });

  it('Dado un join que recibe dos caminos de una decisión, Entonces es un error (bloqueo)', () => {
    const diagram = sketch((put, t) => {
      const decision = put(A.decision);
      const join = put(A.join);
      t.flow(put(A.initialNode), decision);
      const yes = put(A.action, 'Aprobar');
      const no = put(A.action, 'Rechazar');
      t.flow(decision, yes, 'sí');
      t.flow(decision, no, 'no');
      t.flow(yes, join);
      t.flow(no, join);
      t.flow(join, put(A.activityFinal));
    });

    expect(ruleIds(joinUsedAsMerge, diagram)).toEqual(['activity.join-used-as-merge']);
  });
});

describe('nombres de acciones', () => {
  it('Dada una acción sin nombre, Entonces advierte', () => {
    const diagram = sketch((put, t) => t.flow(put(A.initialNode), put(A.action, '  ')));

    expect(ruleIds(actionUnnamed, diagram)).toEqual(['activity.action-unnamed']);
  });

  it('Dada una acción que no empieza con verbo, Entonces informa', () => {
    const diagram = sketch((put, t) => t.flow(put(A.initialNode), put(A.action, 'Nueva acción')));

    expect(actionNotVerb.check(diagram)[0]?.severity).toBe('info');
  });

  it.each(['Validar datos', 'Registrarse', 'Ver pedido', 'Enviarlo al cliente', 'Imprimir', 'Leer correo'])(
    '«%s» empieza con verbo en infinitivo',
    (label) => expect(startsWithInfinitive(label)).toBe(true),
  );

  it.each(['Pago', 'Datos del cliente', 'Nueva acción', 'Factura'])('«%s» no empieza con verbo', (label) =>
    expect(startsWithInfinitive(label)).toBe(false),
  );
});
