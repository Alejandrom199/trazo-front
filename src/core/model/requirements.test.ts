import { describe, expect, it } from 'vitest';
import type { Diagram, DiagramNode } from './diagram';
import { createEmptyDiagram } from './factories';
import {
  coverageSummary,
  impactOf,
  nextRequirementCode,
  requirementCoverage,
  requirementMatrix,
  type Requirement,
  type RequirementLink,
} from './requirements';

const node = (id: string, props: Record<string, unknown> = {}): DiagramNode => ({
  id, artifactType: 'action', label: id, position: { x: 0, y: 0 }, size: { width: 10, height: 10 }, parentId: null, props, notes: '', locked: false,
});
const diagram = (id: string, nodes: DiagramNode[]): Diagram => ({ ...createEmptyDiagram({ name: id, diagramType: 'activity' }), id, nodes });
const requirement = (id: string, status: Requirement['status'] = 'aprobado'): Requirement => ({
  id, code: id, title: id, description: '', kind: 'funcional', priority: 'media', status, createdAt: '',
});
const link = (id: string, requirementId: string, diagramId: string, elementId: string | null): RequirementLink => ({ id, requirementId, diagramId, elementId, createdAt: '' });

describe('requisitos', () => {
  it('Dados códigos usados, Entonces el siguiente sigue la numeración de su tipo', () => {
    const used = [{ code: 'RF-01' }, { code: 'RF-07' }, { code: 'RN-02' }];
    expect(nextRequirementCode(used, 'funcional')).toBe('RF-08');
    expect(nextRequirementCode(used, 'regla de negocio')).toBe('RN-03');
    expect(nextRequirementCode(used, 'no funcional')).toBe('RNF-01');
  });

  it('Dados vínculos vivos y rotos, Entonces la cobertura cuenta solo los vivos y no cuenta los descartados', () => {
    const pedido = diagram('pedido', [node('pagar')]);
    const coverage = requirementCoverage(
      [requirement('r1'), requirement('r2'), requirement('r3', 'descartado')],
      [link('a', 'r1', 'pedido', 'pagar'), link('b', 'r2', 'pedido', 'borrado'), link('c', 'r2', 'fantasma', null)],
      [pedido],
    );
    expect(coverage.map((item) => [item.requirement.id, item.covered, item.broken.length])).toEqual([['r1', true, 0], ['r2', false, 2], ['r3', false, 0]]);
    expect(coverageSummary(coverage)).toEqual({ total: 2, covered: 1, percent: 50 });
  });

  it('Dados vínculos en varios diagramas, Entonces la matriz cuenta cuántos tiene cada requisito en cada diagrama', () => {
    const coverage = requirementCoverage([requirement('r1')], [link('a', 'r1', 'd1', 'x'), link('b', 'r1', 'd1', 'y'), link('c', 'r1', 'd2', null)], [
      diagram('d1', [node('x'), node('y')]),
      diagram('d2', []),
    ]);
    expect(Object.fromEntries(requirementMatrix(coverage).get('r1')!)).toEqual({ d1: 2, d2: 1 });
  });

  it('Dado un requisito, Entonces el impacto sigue vínculos, relaciones y subprocesos hasta el final', () => {
    const pedido = diagram('pedido', [node('pagar', { linkedDiagramId: 'pago' })]);
    const pago = diagram('pago', [node('cobrar')]);
    const casos = diagram('casos', [node('comprar')]);
    const datos = diagram('datos', []);
    const impact = impactOf(
      {
        diagrams: [pedido, pago, casos, datos],
        requirementLinks: [link('a', 'r1', 'pedido', 'pagar'), link('b', 'r2', 'datos', null)],
        traceLinks: [{ source: { diagramId: 'casos', elementId: 'comprar' }, target: { diagramId: 'pedido', elementId: 'pagar' } }],
        diagramRelations: [{ sourceDiagramId: 'pago', targetDiagramId: 'datos' }],
      },
      { requirementId: 'r1' },
    );
    expect([...impact.diagramIds].sort()).toEqual(['casos', 'datos', 'pago', 'pedido']);
    expect([...impact.requirementIds].sort()).toEqual(['r1', 'r2']);
    expect(impact.elementKeys).toEqual(new Set(['pedido:pagar', 'casos:comprar']));
  });
});
