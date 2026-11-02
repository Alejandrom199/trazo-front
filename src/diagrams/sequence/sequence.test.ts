import { describe, expect, it } from 'vitest';
import { validateDiagram, type Template } from '@/core/model';
import { SequenceArtifact as S } from './artifactTypes';
import { initialSequenceEdge, MESSAGE_GAP, resolveSequenceConnection } from './connections';
import { narrateSequence } from './narrator';
import { sequenceRules } from './rules';
import { createSequenceTemplateBuilder } from './templates/templateBuilder';
import { sequenceTemplates } from './templates';

const info = { id: 'prueba', name: 'Prueba', description: '', difficulty: 'básico', learningGoals: [] } satisfies Omit<Template, 'diagram' | 'diagramType'>;
const ruleIds = (template: Template) => validateDiagram(template.diagram, sequenceRules).map((issue) => issue.ruleId);

/** Cliente y servidor con una llamada y su respuesta; `extra` agrega lo que cada caso necesita. */
function conversation(extra: (b: ReturnType<typeof createSequenceTemplateBuilder>, ids: { client: string; server: string }) => void = () => {}) {
  const b = createSequenceTemplateBuilder();
  const client = b.participant(S.actor, 'Cliente', 0, 400);
  const server = b.participant(S.lifeline, ':Servidor', 200, 400);
  b.message(S.syncMessage, client, server, 'pedir()', 100);
  b.message(S.replyMessage, server, client, 'dato', 140);
  extra(b, { client, server });
  return b.build(info);
}

describe('plantillas del diagrama de secuencia', () => {
  it.each(sequenceTemplates)('$name no tiene errores ni advertencias', (template) => {
    const serious = validateDiagram(template.diagram, sequenceRules).filter((issue) => issue.severity !== 'info');
    expect(serious).toEqual([]);
  });

  it.each(sequenceTemplates)('$name contiene cada artefacto que dice enseñar', (template) => {
    const used = new Set([...template.diagram.nodes, ...template.diagram.edges].map((element) => element.artifactType));
    for (const goal of template.learningGoals) expect(used, goal).toContain(goal);
  });
});

describe('conexiones', () => {
  it('Dados dos participantes, Entonces se unen con un mensaje síncrono; también uno consigo mismo', () => {
    const { diagram } = conversation();
    const [client, server] = diagram.nodes;

    expect(resolveSequenceConnection(diagram, client!.id, server!.id)).toEqual({ allowed: true, edgeType: S.syncMessage });
    expect(resolveSequenceConnection(diagram, server!.id, server!.id)).toEqual({ allowed: true, edgeType: S.syncMessage });
  });

  it('Dada una activación, Entonces no se conecta', () => {
    const { diagram } = conversation((b, { server }) => b.activation(server, 100, 140));
    const activation = diagram.nodes.find((node) => node.artifactType === S.activation)!;

    expect(resolveSequenceConnection(diagram, activation.id, diagram.nodes[0]!.id)).toMatchObject({ allowed: false });
  });

  it('Dado un mensaje nuevo, Entonces queda debajo del último', () => {
    const { diagram } = conversation();

    expect(initialSequenceEdge(diagram, S.syncMessage, diagram.nodes[0]!.id).props).toEqual({ offsetY: 140 + MESSAGE_GAP });
  });
});

describe('reglas', () => {
  it('Dada una conversación completa, Entonces no hay problemas', () => {
    expect(ruleIds(conversation())).toEqual([]);
  });

  it('Dada una respuesta sin llamada previa, Entonces avisa', () => {
    const template = conversation((b, { client, server }) => b.message(S.replyMessage, client, server, 'ok', 200));
    expect(ruleIds(template)).toContain('sequence.reply-without-call');
  });

  it('Dado un mensaje después de la destrucción, Entonces es un error', () => {
    const template = conversation((b, { client, server }) => {
      b.destruction(server, 170);
      b.message(S.asyncMessage, client, server, 'avisar()', 220);
    });
    expect(ruleIds(template)).toContain('sequence.message-after-destruction');
  });

  it('Dada una creación que no es lo primero que recibe, Entonces es un error', () => {
    const template = conversation((b, { client, server }) => b.message(S.createMessage, client, server, 'create', 200));
    expect(ruleIds(template)).toContain('sequence.create-not-first');
  });

  it('Dado un fragmento sin guarda y sin mensajes, Entonces avisa de ambas cosas', () => {
    const template = conversation((b) => b.fragment(S.optFragment, '', { x: -10, y: 200, width: 300, height: 60 }));
    expect(ruleIds(template)).toEqual(expect.arrayContaining(['sequence.fragment-guard-missing', 'sequence.fragment-empty']));
  });

  it('Dado un participante que no conversa, Entonces avisa', () => {
    const template = conversation((b) => b.participant(S.lifeline, ':Ocioso', 400, 400));
    expect(ruleIds(template)).toContain('sequence.participant-idle');
  });
});

describe('narración', () => {
  it('Dada una conversación, Entonces presenta a los participantes y cuenta los mensajes en orden', () => {
    const texts = narrateSequence(conversation().diagram).map((line) => line.text);

    expect(texts).toEqual([
      'Participan «Cliente» y «:Servidor».',
      'Primero, «Cliente» llama a «:Servidor» con «pedir()» y espera la respuesta.',
      '«:Servidor» responde a «Cliente» con «dato».',
    ]);
    expect(narrateSequence(conversation().diagram).map((line) => line.kind)).toEqual(['participants', 'step', 'step']);
  });

  it('Dado un alt, Entonces cuenta cada región un nivel más adentro', () => {
    const template = conversation((b, { client, server }) => {
      b.fragment(S.altFragment, 'hay stock', { x: -10, y: 160, width: 340, height: 120 }, 220);
      b.message(S.asyncMessage, server, client, 'confirmar()', 190);
      b.message(S.asyncMessage, server, client, 'rechazar()', 250);
    });
    const lines = narrateSequence(template.diagram).slice(3);

    expect(lines.map((line) => [line.text, line.depth])).toEqual([
      ['Si se cumple [hay stock]:', 0],
      ['«:Servidor» envía «confirmar()» a «Cliente» sin esperar respuesta.', 1],
      ['Si no:', 0],
      ['«:Servidor» envía «rechazar()» a «Cliente» sin esperar respuesta.', 1],
    ]);
    expect(lines.map((line) => line.kind)).toEqual(['branch', 'step', 'branch', 'step']);
  });
});
