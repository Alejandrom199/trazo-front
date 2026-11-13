import { describe, expect, it } from 'vitest';
import { createDiagramFromTemplate, type Diagram, type ValidationRule } from '@/core/model';
import { createRegistry, type DiagramModule } from '@/core/registry';
import { registerDiagramModules } from '@/diagrams';
import { solvedChallenge } from './challengeTracking';

const registry = createRegistry();
registerDiagramModules(registry);
const challenges = registry.list().flatMap((module) =>
  (module.guide.workshop?.correctionChallenges ?? []).map((challenge) => ({ name: `${module.displayName}: ${challenge.title}`, module, challenge })),
);

describe('reto de corregir resuelto', () => {
  it('Hay retos de corregir con los que probar', () => {
    expect(challenges.length).toBeGreaterThan(0);
  });

  it.each(challenges)('$name: recién abierto, sin corregir, no cuenta como resuelto', ({ module, challenge }) => {
    const diagram = createDiagramFromTemplate(challenge.diagram);

    expect(diagram.templateId).toBe(challenge.diagram.id);
    expect(solvedChallenge(diagram, module)).toBeNull();
  });

  // Un módulo real cuyas reglas se sustituyen por una controlable: «hay un nodo llamado ERROR».
  const [{ module: real, challenge } = { module: undefined, challenge: undefined }] = challenges;
  const hasError: ValidationRule | undefined = real && {
    id: 'test.error',
    diagramType: real.diagramType,
    severity: 'error',
    title: 'Nodo erróneo',
    explanation: 'Un nodo llamado ERROR.',
    check: (diagram) =>
      diagram.nodes
        .filter((node) => node.label === 'ERROR')
        .map((node) => ({ ruleId: 'test.error', severity: 'error', message: 'Error', nodeIds: [node.id], edgeIds: [], suggestion: 'Renómbralo' })),
  };
  const module: DiagramModule | undefined = real && hasError && { ...real, rules: [hasError] };
  const withLabels = (diagram: Diagram, label: string): Diagram => ({ ...diagram, nodes: diagram.nodes.map((node) => ({ ...node, label })) });

  it('Dado el reto corregido (sin problemas), Entonces cuenta como resuelto', () => {
    const diagram = withLabels(createDiagramFromTemplate(challenge!.diagram), 'Bien');
    expect(solvedChallenge(diagram, module!)).toBe(challenge);
  });

  it('Dado el reto con problemas, Entonces no cuenta', () => {
    const diagram = withLabels(createDiagramFromTemplate(challenge!.diagram), 'ERROR');
    expect(solvedChallenge(diagram, module!)).toBeNull();
  });

  it('Dado el reto vaciado (sin nodos), Entonces no cuenta: vaciarlo no es corregirlo', () => {
    const diagram = { ...createDiagramFromTemplate(challenge!.diagram), nodes: [], edges: [] };
    expect(solvedChallenge(diagram, module!)).toBeNull();
  });

  it('Dado un diagrama sin problemas que no viene del reto, Entonces no cuenta', () => {
    const diagram = { ...withLabels(createDiagramFromTemplate(challenge!.diagram), 'Bien'), templateId: 'otra-plantilla' };
    expect(solvedChallenge(diagram, module!)).toBeNull();
    expect(solvedChallenge({ ...diagram, templateId: null }, module!)).toBeNull();
  });
});
