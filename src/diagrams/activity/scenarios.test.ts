import { describe, expect, it } from 'vitest';
import { draftTestCase, enumerateScenarios, nextTestCaseCode, replayScenario, scenarioTitle, uncoveredBranches, type CallOutcomes, type Diagram } from '@/core/model';
import { ActivityArtifact as A } from './artifactTypes';
import { createTemplateBuilder } from './templates/templateBuilder';
import { activityWalkthrough as engine } from './walkthrough';

const info = { id: 't', name: 'Préstamo', description: '', difficulty: 'básico' as const, learningGoals: [] };
const at = { x: 0, y: 0 };
const none: CallOutcomes = () => null;

/** Inicio → decisión ¿Disponible? → [sí] Prestar / [no] Reservar → final. */
function twoWays(): Diagram {
  const b = createTemplateBuilder();
  const start = b.node(A.initialNode, '', at);
  const decision = b.node(A.decision, '¿Disponible?', at);
  const lend = b.node(A.action, 'Prestar', at);
  const reserve = b.node(A.action, 'Reservar', at);
  const end = b.node(A.activityFinal, '', at);
  b.flow(start, decision);
  b.flow(decision, lend, 'sí');
  b.flow(decision, reserve, 'no');
  b.flow(lend, end);
  b.flow(reserve, end);
  return b.build(info).diagram;
}

describe('escenarios: caminos posibles de un proceso', () => {
  it('Dada una decisión con dos salidas, Entonces hay un escenario por salida, con su nombre', () => {
    const diagram = twoWays();
    const { scenarios, branches } = enumerateScenarios(engine, diagram, none);
    expect(scenarios.map((scenario) => scenarioTitle(diagram, scenario.choices))).toEqual(['sí', 'no']);
    expect(scenarios.every((scenario) => scenario.final.status === 'finished')).toBe(true);
    expect(branches).toHaveLength(2);
  });

  it('Dado un bucle de reintento, Entonces se recorre una vuelta y los caminos son finitos', () => {
    const b = createTemplateBuilder();
    const start = b.node(A.initialNode, '', at);
    const merge = b.node(A.merge, '', at);
    const enter = b.node(A.action, 'Ingresar datos', at);
    const valid = b.node(A.decision, '¿Datos válidos?', at);
    const save = b.node(A.action, 'Guardar', at);
    const end = b.node(A.activityFinal, '', at);
    b.flow(start, merge);
    b.flow(merge, enter);
    b.flow(enter, valid);
    b.flow(valid, save, 'sí');
    b.flow(valid, merge, 'no');
    b.flow(save, end);
    const diagram = b.build(info).diagram;

    const { scenarios } = enumerateScenarios(engine, diagram, none);
    expect(scenarios.map((scenario) => scenarioTitle(diagram, scenario.choices))).toEqual(['sí', 'no → sí']);
  });

  it('Dado un subproceso con dos resultados y una decisión sobre él, Entonces solo hay caminos coherentes', () => {
    const b = createTemplateBuilder();
    const start = b.node(A.initialNode, '', at);
    const validate = b.node(A.callBehavior, 'Validar', at, undefined, { linkedDiagramId: 'validar' });
    const decision = b.node(A.decision, '¿Disponible?', at);
    const lend = b.node(A.action, 'Prestar', at);
    const reserve = b.node(A.action, 'Reservar', at);
    const end = b.node(A.activityFinal, '', at);
    b.flow(start, validate);
    b.flow(validate, decision);
    b.flow(decision, lend, 'disponible');
    b.flow(decision, reserve, 'no disponible');
    b.flow(lend, end);
    b.flow(reserve, end);
    const diagram = b.build(info).diagram;
    const outcomes: CallOutcomes = () => ({ diagramName: 'Validar disponibilidad', outcomes: ['disponible', 'no disponible'] });

    const { scenarios, branches } = enumerateScenarios(engine, diagram, outcomes);
    expect(scenarios.map((scenario) => scenarioTitle(diagram, scenario.choices))).toEqual(['disponible', 'no disponible']);
    // Ramas: los dos resultados del subproceso y las dos salidas coherentes.
    expect(branches).toHaveLength(4);
    expect(uncoveredBranches(branches, [scenarios[0]!.choices]).map((branch) => branch.label)).toEqual([
      '«Validar disponibilidad» termina en «no disponible»',
      '[no disponible] → «Reservar»',
    ]);
  });

  it('Dado un camino guardado, Entonces se repite paso a paso; si el diagrama cambió, queda desactualizado', () => {
    const diagram = twoWays();
    const [, reserve] = enumerateScenarios(engine, diagram, none).scenarios;
    const replay = replayScenario(engine, diagram, reserve!.choices, none);
    expect(replay.valid).toBe(true);
    expect(replay.states.at(-1)!.log.map((entry) => entry.text)).toContain('[no] se ejecuta «Reservar».');

    const edited = { ...diagram, edges: diagram.edges.filter((edge) => edge.guard !== 'no') };
    expect(replayScenario(engine, edited, reserve!.choices, none).valid).toBe(false);
  });

  it('Dado un camino, Entonces el borrador del caso de prueba lo cuenta en Cuando y Entonces', () => {
    const diagram = twoWays();
    const [, reserve] = enumerateScenarios(engine, diagram, none).scenarios;
    expect(draftTestCase(diagram, reserve!.choices, reserve!.final)).toEqual({
      title: 'no',
      given: '',
      when: '¿Disponible? → no',
      then: 'Se ejecuta «Reservar». El proceso termina.',
    });
    expect(nextTestCaseCode([{ code: 'CP-01' }, { code: 'CP-07' }])).toBe('CP-08');
  });
});
