import type { Diagram } from './diagram';
import { nodeName } from './nodeName';
import { answersMatch } from './walkMemory';
import type { WalkChoice, WalkState } from './walkthrough';

/**
 * Caso de prueba: un camino de un proceso (sus elecciones) guardado con nombre,
 * escrito como Dado / Cuando / Entonces y enlazado a los requisitos que verifica.
 * El camino se guarda como elecciones, no como texto: si el diagrama cambia y
 * ya no se puede recorrer, el caso queda marcado como desactualizado.
 */

export const TEST_STATUSES = ['pendiente', 'pasa', 'falla'] as const;
export type TestStatus = (typeof TEST_STATUSES)[number];

export interface TestCase {
  id: string;
  /** «CP-01». */
  code: string;
  title: string;
  diagramId: string;
  choices: WalkChoice[];
  given: string;
  when: string;
  then: string;
  requirementIds: string[];
  status: TestStatus;
  createdAt: string;
}

export const isTestStatus = (value: unknown): value is TestStatus => TEST_STATUSES.includes(value as TestStatus);

/** Siguiente código libre: CP-01, CP-02… */
export function nextTestCaseCode(cases: readonly Pick<TestCase, 'code'>[]): string {
  const highest = Math.max(0, ...cases.map((item) => Number(/^CP-?(\d+)$/i.exec(item.code)?.[1] ?? 0)));
  return `CP-${String(highest + 1).padStart(2, '0')}`;
}

/** Texto de una elección: la guarda elegida o el resultado del subproceso. */
export function choiceText(diagram: Diagram, choice: WalkChoice): { question: string; answer: string } {
  const node = diagram.nodes.find((candidate) => candidate.id === choice.nodeId);
  if ('edgeId' in choice) {
    const edge = diagram.edges.find((candidate) => candidate.id === choice.edgeId);
    const target = diagram.nodes.find((candidate) => candidate.id === edge?.targetId);
    return { question: nodeName(node, 'Decisión'), answer: edge?.guard?.trim() || edge?.label.trim() || `hacia ${nodeName(target, 'el siguiente paso')}` };
  }
  return { question: nodeName(node, 'Subproceso'), answer: choice.outcome ?? 'sin entrar' };
}

/**
 * Nombre corto del camino: sus respuestas, en orden. Una respuesta igual a la
 * anterior (la decisión que sigue al resultado de un subproceso) no se repite.
 */
export function scenarioTitle(diagram: Diagram, choices: readonly WalkChoice[]): string {
  if (choices.length === 0) return 'Camino único';
  const answers = choices.map((choice) => choiceText(diagram, choice).answer);
  return answers.filter((answer, index) => index === 0 || !answersMatch(answer, answers[index - 1]!)).join(' → ');
}

/** El paso sin la guarda por la que se llegó («[no] Se ejecuta…»): la guarda ya está en Cuando. */
function withoutGuard(text: string): string {
  const plain = text.replace(/^\[[^\]]*\]\s*/, '');
  return plain.charAt(0).toUpperCase() + plain.slice(1);
}

/**
 * Borrador de Dado / Cuando / Entonces a partir del camino recorrido. Dado
 * queda vacío: las precondiciones las sabe quien prueba (o la ficha del caso de uso).
 */
export function draftTestCase(diagram: Diagram, choices: readonly WalkChoice[], final: WalkState): Pick<TestCase, 'title' | 'given' | 'when' | 'then'> {
  const when = choices.map((choice) => {
    const { question, answer } = choiceText(diagram, choice);
    return `${question} → ${answer}`;
  });
  const lastStep = [...final.log].reverse().find((entry) => entry.tone === 'step');
  const ending = final.status === 'stuck'
    ? 'El proceso se traba sin llegar a un final.'
    : final.outcome?.from === 'final'
      ? `El proceso termina con el resultado «${final.outcome.label}».`
      : 'El proceso termina.';
  return {
    title: scenarioTitle(diagram, choices),
    given: '',
    when: when.length > 0 ? when.join('\n') : `Se recorre «${diagram.name}» de principio a fin.`,
    then: lastStep ? `${withoutGuard(lastStep.text)} ${ending}` : ending,
  };
}
