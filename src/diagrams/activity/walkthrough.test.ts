import { describe, expect, it } from 'vitest';
import type { Diagram, WalkState } from '@/core/model';
import { ActivityArtifact as A } from './artifactTypes';
import { createTemplateBuilder } from './templates/templateBuilder';
import { activityWalkthrough as walk } from './walkthrough';

const info = { id: 't', name: 'Pedido', description: '', difficulty: 'básico' as const, learningGoals: [] };
const at = { x: 0, y: 0 };

/** Avanza hasta que el recorrido pida una decisión o termine (con tope). */
function run(diagram: Diagram, state: WalkState = walk.start(diagram)): WalkState {
  let current = state;
  for (let guard = 0; guard < 100 && current.status === 'running'; guard += 1) current = walk.step(diagram, current);
  return current;
}

describe('recorrido paso a paso de actividades', () => {
  it('Dado un flujo lineal, Entonces recorre cada acción en orden y termina en el final', () => {
    const b = createTemplateBuilder();
    const start = b.node(A.initialNode, '', at);
    const take = b.node(A.action, 'Tomar pedido', at);
    const pay = b.node(A.action, 'Cobrar', at);
    const end = b.node(A.activityFinal, '', at);
    b.flow(start, take);
    b.flow(take, pay);
    b.flow(pay, end);
    const diagram = b.build(info).diagram;

    const state = run(diagram);
    expect(state.status).toBe('finished');
    expect(state.log.map((item) => item.text)).toEqual([
      'Empieza «Pedido».',
      'Se ejecuta «Tomar pedido».',
      'Se ejecuta «Cobrar».',
      'El proceso termina en el final de actividad.',
    ]);
  });

  it('Dada una decisión, Entonces se detiene y sigue por el camino elegido', () => {
    const b = createTemplateBuilder();
    const start = b.node(A.initialNode, '', at);
    const decide = b.node(A.decision, '¿Hay stock?', at);
    const ship = b.node(A.action, 'Despachar', at);
    const notify = b.node(A.action, 'Avisar falta', at);
    const end = b.node(A.activityFinal, '', at);
    b.flow(start, decide);
    b.flow(decide, ship, 'sí');
    b.flow(decide, notify, 'no');
    b.flow(ship, end);
    b.flow(notify, end);
    const diagram = b.build(info).diagram;

    const paused = run(diagram);
    expect(paused.status).toBe('choice');
    expect(paused.choice!.options.map((option) => option.label)).toEqual(['[sí] → «Despachar»', '[no] → «Avisar falta»']);

    const chosen = walk.step(diagram, paused, paused.choice!.options[1]!.edgeId);
    expect(chosen.log.at(-1)!.text).toBe('[no] se ejecuta «Avisar falta».');
    expect(run(diagram, chosen).visitedNodeIds).not.toContain(ship);
  });

  it('Dado un fork y un join, Entonces recorre ambas ramas y el join espera a las dos', () => {
    const b = createTemplateBuilder();
    const start = b.node(A.initialNode, '', at);
    const fork = b.node(A.fork, '', at);
    const pack = b.node(A.action, 'Empacar', at);
    const bill = b.node(A.action, 'Facturar', at);
    const join = b.node(A.join, '', at);
    const end = b.node(A.activityFinal, '', at);
    b.flow(start, fork);
    b.flow(fork, pack);
    b.flow(fork, bill);
    b.flow(pack, join);
    b.flow(bill, join);
    b.flow(join, end);
    const diagram = b.build(info).diagram;

    const state = run(diagram);
    expect(state.status).toBe('finished');
    expect(state.log.some((item) => item.tone === 'wait')).toBe(true);
    expect(state.visitedNodeIds).toEqual(expect.arrayContaining([pack, bill, join, end]));
  });

  it('Dada una acción que recibe dos caminos alternativos, Entonces el recorrido se traba y lo explica', () => {
    const b = createTemplateBuilder();
    const start = b.node(A.initialNode, '', at);
    const decide = b.node(A.decision, '', at);
    const approve = b.node(A.action, 'Aprobar', at);
    const reject = b.node(A.action, 'Rechazar', at);
    const notify = b.node(A.action, 'Notificar', at);
    b.flow(start, decide);
    b.flow(decide, approve, 'ok');
    b.flow(decide, reject, 'no');
    b.flow(approve, notify);
    b.flow(reject, notify);
    const diagram = b.build(info).diagram;

    const paused = run(diagram);
    const state = run(diagram, walk.step(diagram, paused, paused.choice!.options[0]!.edgeId));
    expect(state.status).toBe('stuck');
    expect(state.log.some((item) => item.text.includes('espera a TODAS'))).toBe(true);
    expect(state.log.at(-1)!.nodeIds).toEqual([notify]);
  });

  it('Dado un diagrama sin nodo inicial, Entonces no puede empezar', () => {
    const b = createTemplateBuilder();
    b.node(A.action, 'Suelta', at);
    expect(walk.start(b.build(info).diagram).status).toBe('stuck');
  });
});

describe('recorrido con subprocesos', () => {
  function withSubprocess(linked: boolean) {
    const b = createTemplateBuilder();
    const start = b.node(A.initialNode, '', at);
    const pay = b.node(A.callBehavior, 'Procesar pago', at, undefined, linked ? { linkedDiagramId: 'pago' } : {});
    const ship = b.node(A.action, 'Despachar', at);
    const end = b.node(A.activityFinal, '', at);
    b.flow(start, pay);
    b.flow(pay, ship);
    b.flow(ship, end);
    return { diagram: b.build(info).diagram, pay, ship };
  }

  it('Dado un subproceso enlazado, Entonces el recorrido se detiene a preguntar si entrar', () => {
    const { diagram, pay } = withSubprocess(true);
    const paused = run(diagram);
    expect(paused.status).toBe('call');
    expect(paused.call).toMatchObject({ nodeId: pay, diagramId: 'pago' });
    expect(walk.step(diagram, paused)).toBe(paused);
  });

  it('Dado que se sigue sin entrar o se vuelve del subproceso, Entonces continúa después del ⋔', () => {
    const { diagram, ship } = withSubprocess(true);
    const paused = run(diagram);
    const skipped = run(diagram, walk.resumeCall!(diagram, paused, 'skipped'));
    expect(skipped.status).toBe('finished');
    expect(skipped.visitedNodeIds).toContain(ship);
    expect(skipped.log.some((item) => item.text.startsWith('Se sigue sin entrar en «Procesar pago»'))).toBe(true);

    const returned = walk.resumeCall!(diagram, paused, 'returned');
    expect(returned.log.find((item) => item.text.startsWith('Terminó «Procesar pago»'))).toBeDefined();
  });

  it('Dado un subproceso sin diagrama enlazado, Entonces se recorre como una acción más', () => {
    const { diagram } = withSubprocess(false);
    expect(run(diagram).status).toBe('finished');
  });
});

describe('recorrido con memoria: resultado del subproceso y lo decidido', () => {
  /** Proceso mayor: subproceso enlazado, fusión y una decisión sobre su resultado. */
  function parentProcess() {
    const b = createTemplateBuilder();
    const start = b.node(A.initialNode, '', at);
    const validate = b.node(A.callBehavior, 'Validar', at, undefined, { linkedDiagramId: 'validar' });
    const merge = b.node(A.merge, '', at);
    const decision = b.node(A.decision, '¿Disponible?', at);
    const lend = b.node(A.action, 'Prestar', at);
    const reserve = b.node(A.action, 'Reservar', at);
    const end = b.node(A.activityFinal, '', at);
    b.flow(start, validate);
    b.flow(validate, merge);
    b.flow(merge, decision);
    b.flow(decision, lend, 'disponible');
    b.flow(decision, reserve, 'no disponible');
    b.flow(lend, end);
    b.flow(reserve, end);
    const diagram = b.build(info).diagram;
    const edgeTo = (target: string) => diagram.edges.find((edge) => edge.sourceId === decision && edge.targetId === target)!.id;
    return { diagram, lendEdge: edgeTo(lend), reserveEdge: edgeTo(reserve) };
  }

  /** Subproceso: una decisión y dos finales; `named` les pone nombre. */
  function subprocess(named: boolean) {
    const b = createTemplateBuilder();
    const start = b.node(A.initialNode, '', at);
    const copies = b.node(A.decision, '¿Hay ejemplares libres?', at);
    const ok = b.node(A.activityFinal, named ? 'disponible' : '', at);
    const none = b.node(A.activityFinal, named ? 'no disponible' : '', at);
    b.flow(start, copies);
    b.flow(copies, ok, 'sí');
    b.flow(copies, none, 'no');
    const diagram = b.build({ ...info, name: 'Validar disponibilidad' }).diagram;
    return { diagram, noEdge: diagram.edges.find((edge) => edge.targetId === none)!.id };
  }

  function returnFrom(named: boolean) {
    const parent = parentProcess();
    const sub = subprocess(named);
    const child = run(sub.diagram, walk.step(sub.diagram, run(sub.diagram), sub.noEdge));
    const paused = run(parent.diagram);
    const back = run(parent.diagram, walk.resumeCall!(parent.diagram, paused, 'returned', { outcome: child.outcome, facts: child.facts }));
    return { parent, child, back };
  }

  it('Dado un subproceso que termina en «no disponible», Entonces la decisión siguiente sugiere esa salida', () => {
    const { parent, child, back } = returnFrom(true);
    expect(child.outcome).toMatchObject({ label: 'no disponible', from: 'final' });
    expect(back.status).toBe('choice');
    expect(back.choice?.suggested?.edgeId).toBe(parent.reserveEdge);
    expect(back.facts.map((fact) => `${fact.question}=${fact.answer}`)).toEqual(['¿Hay ejemplares libres?=no']);
  });

  it('Dado que se elige la salida contraria a la sugerida, Entonces se permite pero queda avisado', () => {
    const { parent, back } = returnFrom(true);
    const contradicted = walk.step(parent.diagram, back, parent.lendEdge);
    expect(contradicted.log.some((item) => item.tone === 'warning' && item.text.startsWith('Elegiste [disponible]'))).toBe(true);
  });

  it('Dados finales sin nombre, Entonces el resultado es la última respuesta y, si no coincide, se avisa y se elige a mano', () => {
    const { child, back } = returnFrom(false);
    expect(child.outcome).toMatchObject({ label: 'no', from: 'decision' });
    expect(back.choice?.suggested).toBeNull();
    expect(back.log.at(-1)?.text).toContain('nombra el final del subproceso igual que la guarda');
  });

  it('Dado que se sigue sin entrar, Entonces no hay resultado ni sugerencia', () => {
    const parent = parentProcess();
    const back = run(parent.diagram, walk.resumeCall!(parent.diagram, run(parent.diagram), 'skipped'));
    expect(back.choice?.suggested).toBeNull();
  });

  it('Dado lo decidido en el proceso mayor, Entonces el subproceso lo recibe y sugiere la misma respuesta', () => {
    const sub = subprocess(true);
    const inherited = run(sub.diagram, walk.start(sub.diagram, [{ question: '¿Hay ejemplares libres?', answer: 'no', nodeId: 'otro', diagramName: 'Catálogo' }]));
    expect(inherited.choice?.suggested?.edgeId).toBe(sub.noEdge);
  });
});
