import { describe, expect, it } from 'vitest';
import { createEmptyDiagram, validateDiagram } from '@/core/model';
import { createRegistry } from '@/core/registry';
import { UseCaseArtifact as U } from './artifactTypes';
import { resolveUseCaseConnection } from './connections';
import { narrateUseCase } from './narrator';
import { useCaseRules } from './rules';
import { useCaseTemplates } from './templates';
import { createUseCaseTemplateBuilder } from './templates/templateBuilder';
import { useCaseWorkshop } from './workshop';
import { useCaseModule } from '.';

describe('módulo de casos de uso', () => {
  it('se registra como un módulo coherente', () => {
    const registry = createRegistry();
    registry.register(useCaseModule);
    expect(registry.get('usecase')).toBe(useCaseModule);
  });

  it.each(useCaseTemplates)('$name no tiene errores ni advertencias', (template) => {
    const serious = validateDiagram(template.diagram, useCaseRules).filter((issue) => issue.severity !== 'info');
    expect(serious).toEqual([]);
  });

  it.each(useCaseTemplates)('$name contiene cada artefacto que dice enseñar', (template) => {
    const used = new Set([...template.diagram.nodes, ...template.diagram.edges].map((element) => element.artifactType));
    for (const goal of template.learningGoals) expect(used).toContain(goal);
  });

  it('reserva el nivel avanzado para escenarios con decisiones complejas', () => {
    expect(useCaseTemplates.filter((template) => template.difficulty === 'avanzado')).toHaveLength(2);
    expect(useCaseTemplates.find((template) => template.id === 'usecase.administration')?.difficulty).toBe('intermedio');
  });

  it('el reto de corrección anuncia exactamente los problemas que detecta el editor', () => {
    const challenge = useCaseWorkshop.correctionChallenges[0]!;
    expect(validateDiagram(challenge.diagram.diagram, useCaseRules)).toHaveLength(challenge.expectedProblems);
  });
});

describe('conexiones de casos de uso', () => {
  const diagram = () => {
    const b = createUseCaseTemplateBuilder();
    const boundary = b.boundary('Sistema', { x: 200, y: 0 });
    const actor = b.actor('Cliente', { x: 0, y: 80 });
    const useCase = b.useCase('Comprar', { x: 80, y: 80 }, boundary);
    const other = b.useCase('Pagar', { x: 300, y: 80 }, boundary);
    return { diagram: b.build({ id: 'x', name: 'x', description: '', difficulty: 'básico', learningGoals: [] }).diagram, actor, useCase, other, boundary };
  };

  it('une actor y caso de uso mediante asociación', () => {
    const { diagram: model, actor, useCase } = diagram();
    expect(resolveUseCaseConnection(model, actor, useCase)).toEqual({ allowed: true, edgeType: U.association });
  });

  it('propone include entre casos de uso y rechaza el límite', () => {
    const { diagram: model, useCase, other, boundary } = diagram();
    expect(resolveUseCaseConnection(model, useCase, other)).toEqual({ allowed: true, edgeType: U.include });
    expect(resolveUseCaseConnection(model, boundary, useCase)).toMatchObject({ allowed: false });
  });
});

describe('validación y narración', () => {
  it('avisa cuando un caso de uso queda fuera del sistema', () => {
    const b = createUseCaseTemplateBuilder();
    b.actor('Cliente', { x: 0, y: 0 });
    const diagram = b.build({ id: 'x', name: 'x', description: '', difficulty: 'básico', learningGoals: [] }).diagram;
    const ids = validateDiagram(diagram, useCaseRules).map((issue) => issue.ruleId);
    expect(ids).toContain('usecase.boundary-missing');
    expect(ids).toContain('usecase.isolated');
  });

  it('narra el sistema, los actores y sus objetivos', () => {
    const lines = narrateUseCase(useCaseTemplates[0]!.diagram);
    expect(lines[0]).toMatchObject({ kind: 'start' });
    expect(lines.map((line) => line.text).join('\n')).toContain('El actor «Cliente» participa');
  });

  it('un lienzo vacío no produce problemas ni narración', () => {
    const diagram = createEmptyDiagram({ diagramType: 'usecase', name: 'x' });
    expect(validateDiagram(diagram, useCaseRules)).toEqual([]);
    expect(narrateUseCase(diagram)).toEqual([]);
  });
});
