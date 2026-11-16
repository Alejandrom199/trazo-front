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
