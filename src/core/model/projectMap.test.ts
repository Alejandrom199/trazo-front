import { describe, expect, it } from 'vitest';
import { createEmptyDiagram } from './factories';
import type { Diagram, DiagramType } from './diagram';
import { buildMapEdges, diagramsByPhase } from './projectMap';

const diagram = (id: string, type: DiagramType, linkedIds: string[] = []): Diagram => ({
  ...createEmptyDiagram({ name: id, diagramType: type }),
  id,
  nodes: linkedIds.map((linked, index) => ({
    id: `${id}-n${index}`, artifactType: 'callBehavior', label: linked, position: { x: 0, y: 0 }, size: { width: 10, height: 10 },
    parentId: null, props: { linkedDiagramId: linked }, notes: '', locked: false,
  })),
});
const trace = (id: string, from: string, to: string) => ({
  id, source: { diagramId: from, elementId: 'x', kind: 'node' as const }, target: { diagramId: to, elementId: 'y', kind: 'node' as const }, relation: 'detalla' as const, createdAt: '',
});

describe('mapa del proyecto', () => {
  it('Dados subprocesos, vínculos y relaciones, Entonces cada par de diagramas tiene una flecha por tipo y relación, con su cantidad', () => {
    const pedido = diagram('pedido', 'activity', ['pago', 'pago', 'fuera']);
    const pago = diagram('pago', 'activity');
    const casos = diagram('casos', 'usecase');
    const edges = buildMapEdges([pedido, pago, casos], {
      traceLinks: [trace('t1', 'casos', 'pedido'), trace('t2', 'casos', 'pedido')],
      diagramRelations: [{ id: 'r1', sourceDiagramId: 'pago', targetDiagramId: 'casos', relation: 'implementa', createdAt: '' }],
    });
    expect(edges).toEqual([
      { sourceId: 'pedido', targetId: 'pago', kind: 'subprocess', label: 'subproceso', count: 2 },
      { sourceId: 'casos', targetId: 'pedido', kind: 'trace', label: 'detalla', count: 2 },
      { sourceId: 'pago', targetId: 'casos', kind: 'relation', label: 'implementa', count: 1 },
    ]);
  });

  it('Dados diagramas de varios tipos, Entonces cada uno cae en su fase y las fases vacías siguen presentes', () => {
    const phases = diagramsByPhase([diagram('a', 'class'), diagram('b', 'usecase'), diagram('c', 'er')]);
    expect(phases.get('scope')!.map((item) => item.id)).toEqual(['b']);
    expect(phases.get('domain')!.map((item) => item.id)).toEqual(['a']);
    expect(phases.get('data')!.map((item) => item.id)).toEqual(['c']);
    expect(phases.get('deployment')).toEqual([]);
  });
});
