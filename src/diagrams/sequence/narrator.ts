import type { Diagram, Narration, NarrationKind, NarrationLine } from '@/core/model';
import { SequenceArtifact as S } from './artifactTypes';
import { buildSequenceModel, isInside, nameOf, regionOf, type FragmentArea, type SequenceModel, type TimedMessage } from './sequenceModel';

/**
 * Narrador del diagrama de secuencia: cuenta la conversación de arriba abajo
 * (el orden del tiempo) en español. Es determinista y no usa IA.
 *
 * - Primero presenta a los participantes.
 * - Cada mensaje es una línea según su tipo: llama y espera, envía sin esperar,
 *   responde o crea.
 * - Al entrar en un fragmento se dice su condición ("Si se cumple [x]:", "Se repite
 *   mientras [x]:"…) y sus mensajes van un nivel más adentro; al cruzar la línea
 *   de un alt se dice "Si no:".
 * - La destrucción de un participante se cuenta en su momento.
 */
export function narrateSequence(diagram: Diagram): Narration {
  const model = buildSequenceModel(diagram);
  if (model.participants.length === 0) return [];
  return new SequenceNarrator(diagram, model).run();
}

type Event = { kind: 'message'; message: TimedMessage } | { kind: 'destruction'; nodeId: string; lifelineId: string; y: number };

interface OpenFragment {
  fragment: FragmentArea;
  region: 0 | 1;
}

class SequenceNarrator {
  private readonly lines: NarrationLine[] = [];
  /** Fragmentos abiertos, del más externo al más interno. */
  private open: OpenFragment[] = [];
  private toldFirst = false;

  constructor(
    private readonly diagram: Diagram,
    private readonly model: SequenceModel,
  ) {}

  run(): Narration {
    this.introduceParticipants();
    for (const event of this.events()) {
      if (event.kind === 'message') this.tellMessage(event.message);
      else this.tellDestruction(event.nodeId, event.lifelineId);
    }
    return this.lines;
  }

  private introduceParticipants(): void {
    const names = [...this.model.participants]
      .sort((a, b) => this.model.centerXOf(a.id) - this.model.centerXOf(b.id))
      .map((participant) => `«${participant.label.trim() || 'sin nombre'}»`);
    this.say(`Participan ${listOf(names)}.`, 0, this.model.participants.map((participant) => participant.id), [], 'participants');
    if (this.model.messages.length === 0) this.say('Todavía no se envían mensajes entre ellos.', 0, [], [], 'warning');
  }

  private events(): Event[] {
    const messages: Event[] = this.model.messages.map((message) => ({ kind: 'message', message }));
    const destructions: Event[] = this.model.destructions.map((destruction) => ({
      kind: 'destruction',
      nodeId: destruction.node.id,
      lifelineId: destruction.lifelineId,
      y: destruction.y,
    }));
    const yOf = (event: Event) => (event.kind === 'message' ? event.message.y : event.y);
    return [...messages, ...destructions].sort((a, b) => yOf(a) - yOf(b));
  }

  private tellMessage(message: TimedMessage): void {
    this.enterFragmentsOf(message);
    const { edge } = message;
    const from = `«${nameOf(this.diagram, edge.sourceId)}»`;
    const to = `«${nameOf(this.diagram, edge.targetId)}»`;
    const label = edge.label.trim();
    const what = label ? `«${label}»` : 'un mensaje sin nombre';
    const self = edge.sourceId === edge.targetId;

    let text: string;
    switch (edge.artifactType) {
      case S.syncMessage:
        text = self ? `${from} se llama a sí mismo: ${what}.` : `${from} llama a ${to} con ${what} y espera la respuesta.`;
        break;
      case S.asyncMessage:
        text = self ? `${from} se envía ${what} sin esperar.` : `${from} envía ${what} a ${to} sin esperar respuesta.`;
        break;
      case S.replyMessage:
        text = `${from} responde a ${to}${label ? ` con «${label}»` : ''}.`;
        break;
      case S.createMessage:
        text = `${from} crea a ${to}${label && label.toLowerCase() !== 'create' ? ` con «${label}»` : ''}.`;
        break;
      default:
        text = `${from} se comunica con ${to}.`;
    }
    const connector = this.toldFirst ? '' : 'Primero, ';
    this.toldFirst = true;
    this.say(connector ? `${connector}${lowerFirst(text)}` : text, this.open.length, [], [edge.id]);
  }

  private tellDestruction(nodeId: string, lifelineId: string): void {
    this.say(`«${nameOf(this.diagram, lifelineId)}» se destruye y deja de existir.`, this.open.length, [nodeId, lifelineId], [], 'end');
  }

  /**
   * Ajusta los fragmentos abiertos a los que contienen este mensaje: cierra los
   * que ya no lo contienen, anuncia un cambio de región y abre los nuevos.
   */
  private enterFragmentsOf(message: TimedMessage): void {
    const containing = this.model.fragments
      .filter((fragment) => isInside(this.model, message, fragment))
      // Del más externo al más interno: el de más arriba y, a igual altura, el más grande.
      .sort((a, b) => a.top - b.top || b.bottom - b.top - (a.bottom - a.top));

    // Se conserva la parte común (mismos fragmentos, en el mismo orden).
    let kept = 0;
    while (kept < this.open.length && this.open[kept]!.fragment === containing[kept]) kept += 1;
    this.open = this.open.slice(0, kept);

    // Si el mensaje cruzó la línea de un fragmento abierto, todo lo de dentro se cierra.
    const crossed = this.open.findIndex((entry) => regionOf(entry.fragment, message) !== entry.region);
    if (crossed >= 0) {
      const entry = this.open[crossed]!;
      this.open = this.open.slice(0, crossed);
      this.open.push({ fragment: entry.fragment, region: 1 });
      this.say(regionHeader(entry.fragment, 1), crossed, [entry.fragment.node.id], [], regionKind(entry.fragment));
    }

    for (const fragment of containing.slice(this.open.length)) {
      const region = regionOf(fragment, message);
      this.say(regionHeader(fragment, region), this.open.length, [fragment.node.id], [], regionKind(fragment));
      this.open.push({ fragment, region });
    }
  }

  private say(
    text: string,
    depth: number,
    nodeIds: string[] = [],
    edgeIds: string[] = [],
    kind: NarrationKind = 'step',
  ): void {
    this.lines.push({ text, kind, depth, nodeIds, edgeIds });
  }
}

function regionKind({ node }: FragmentArea): NarrationKind {
  return node.artifactType === S.parFragment ? 'parallel' : node.artifactType === S.loopFragment ? 'decision' : 'branch';
}

/** Cómo se anuncia cada región de un fragmento. */
function regionHeader({ node }: FragmentArea, region: 0 | 1): string {
  const guard = node.label.trim();
  switch (node.artifactType) {
    case S.altFragment:
      return region === 0 ? `Si se cumple [${guard || 'sin condición'}]:` : 'Si no:';
    case S.optFragment:
      return `Solo si [${guard || 'sin condición'}]:`;
    case S.loopFragment:
      return guard ? `Se repite mientras [${guard}]:` : 'Se repite:';
    case S.parFragment:
      return region === 0 ? `A la vez, en paralelo${guard ? ` (${guard})` : ''}:` : 'Y al mismo tiempo:';
    default:
      return 'En este tramo:';
  }
}

function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
