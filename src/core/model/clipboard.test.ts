import { describe, expect, it } from 'vitest';
import { copySelection, pasteClipboard } from './clipboard';
import { DEFAULT_EDGE_SHAPE, type Diagram, type DiagramNode } from './diagram';
import { createEmptyDiagram } from './factories';

const node = (id: string, extra: Partial<DiagramNode> = {}): DiagramNode => ({
  id,
  artifactType: 'action',
  label: id,
  position: { x: 0, y: 0 },
  size: { width: 100, height: 50 },
  parentId: null,
  props: {},
  notes: '',
  locked: false,
  ...extra,
});
const edge = (id: string, sourceId: string, targetId: string) => ({ id, artifactType: 'controlFlow', sourceId, targetId, guard: null, label: '', ...DEFAULT_EDGE_SHAPE, waypoints: [], props: {} });

const diagram: Diagram = {
  ...createEmptyDiagram({ diagramType: 'activity', name: 'x' }),
  nodes: [node('carril', { artifactType: 'partition' }), node('a', { parentId: 'carril', position: { x: 10, y: 20 } }), node('b', { locked: true }), node('c')],
  edges: [edge('ab', 'a', 'b'), edge('bc', 'b', 'c')],
};

let counter = 0;
const options = { offset: { x: 24, y: 24 }, createId: () => `nuevo${++counter}` };

describe('copySelection', () => {
  it('Dado un contenedor, Entonces copia también lo que tiene dentro', () => {
    expect(copySelection(diagram, { nodeIds: ['carril'], edgeIds: [] })?.nodes.map((n) => n.id)).toEqual(['carril', 'a']);
  });

  it('Dada una flecha con un extremo fuera de la copia, Entonces no se copia', () => {
    const clipboard = copySelection(diagram, { nodeIds: ['b', 'c', 'a'], edgeIds: [] });
    expect(clipboard?.edges.map((e) => e.id).sort()).toEqual(['ab', 'bc']);
    expect(copySelection(diagram, { nodeIds: ['b'], edgeIds: ['bc'] })?.edges).toEqual([]);
  });

  it('Dada una selección sin nodos, Entonces no hay nada que copiar', () => {
    expect(copySelection(diagram, { nodeIds: [], edgeIds: ['ab'] })).toBeNull();
  });
});

describe('pasteClipboard', () => {
  it('Dada una copia, Entonces pega con ids nuevos, corrida, desbloqueada y con las flechas reconectadas', () => {
    const clipboard = copySelection(diagram, { nodeIds: ['b', 'c'], edgeIds: [] })!;
    const pasted = pasteClipboard(diagram, clipboard, options);

    const [b, c] = pasted.nodes;
    expect(b).toMatchObject({ position: { x: 24, y: 24 }, locked: false });
    expect(pasted.edges[0]).toMatchObject({ sourceId: b!.id, targetId: c!.id });
    expect(pasted.nodes.map((n) => n.id)).not.toContain('b');
  });

  it('Dado un contenedor copiado con su contenido, Entonces el contenido queda dentro de la copia sin correrse otra vez', () => {
    const clipboard = copySelection(diagram, { nodeIds: ['carril'], edgeIds: [] })!;
    const [lane, inside] = pasteClipboard(diagram, clipboard, options).nodes;

    expect(inside).toMatchObject({ parentId: lane!.id, position: { x: 10, y: 20 } });
  });

  it('Dado un nodo copiado sin su contenedor, Entonces vuelve al mismo contenedor', () => {
    const clipboard = copySelection(diagram, { nodeIds: ['a'], edgeIds: [] })!;
    expect(pasteClipboard(diagram, clipboard, options).nodes[0]).toMatchObject({ parentId: 'carril', position: { x: 34, y: 44 } });
  });

  it('Dado un nodo que comparte fila, Entonces solo se corre en horizontal', () => {
    const clipboard = copySelection(diagram, { nodeIds: ['c'], edgeIds: [] })!;
    const [pasted] = pasteClipboard(diagram, clipboard, { ...options, keepsRow: () => true }).nodes;
    expect(pasted!.position).toEqual({ x: 24, y: 0 });
  });
});
