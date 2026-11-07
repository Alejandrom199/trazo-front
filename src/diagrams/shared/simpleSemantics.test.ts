import { describe, expect, it } from 'vitest';
import { addEdge, addNode, createEmptyDiagram, DEFAULT_EDGE_SHAPE, validateDiagram, type Diagram, type DiagramType } from '@/core/model';
import { communicationModule } from '@/diagrams/communication';
import { compositeModule } from '@/diagrams/composite';
import { interactionOverviewModule } from '@/diagrams/interactionOverview';
import { objectModule } from '@/diagrams/object';
import { profileModule } from '@/diagrams/profile';
import { timingModule } from '@/diagrams/timing';

function base(type: DiagramType): Diagram {
  return createEmptyDiagram({ diagramType: type, name: 'Prueba' }, new Date(0));
}
function withNode(diagram: Diagram, id: string, artifactType: string, label = id, parentId: string | null = null, props: Record<string, unknown> = {}): Diagram {
  return addNode(diagram, { id, artifactType, label, position: { x: 0, y: 0 }, size: { width: 120, height: 60 }, parentId, props, notes: '', locked: false });
}

const modules = [objectModule, profileModule, compositeModule, communicationModule, interactionOverviewModule, timingModule];

describe('semántica de los módulos UML especializados', () => {
  it('objetos impide enlazar dos valores y un valor con varios dueños', () => {
    let diagram = withNode(base('object'), 'a', 'valueSpecification', 'x = 1');
    diagram = withNode(diagram, 'b', 'valueSpecification', 'y = 2');
    expect(objectModule.resolveConnection(diagram, 'a', 'b').allowed).toBe(false);
    diagram = withNode(diagram, 'o', 'objectInstance', 'ana: Estudiante');
    diagram = addEdge(diagram, { id: 'e1', artifactType: 'objectLink', sourceId: 'a', targetId: 'o', label: '', guard: null, ...DEFAULT_EDGE_SHAPE, props: {} });
    expect(objectModule.resolveConnection(diagram, 'a', 'o').allowed).toBe(false);
  });

  it('objetos exige clasificador o notación instancia: Clase', () => {
    const diagram = withNode(base('object'), 'o', 'objectInstance', 'ana');
    expect(validateDiagram(diagram, objectModule.rules).some((problem) => problem.ruleId === 'object.instance-notation')).toBe(true);
  });

  it('perfiles deduce una extensión y rechaza el sentido inverso', () => {
    let diagram = withNode(base('profile'), 's', 'stereotype', 'service');
    diagram = withNode(diagram, 'm', 'metaclass', 'Component');
    expect(profileModule.resolveConnection(diagram, 's', 'm')).toEqual({ allowed: true, edgeType: 'extension' });
    expect(profileModule.resolveConnection(diagram, 'm', 's').allowed).toBe(false);
  });

  it('estructura compuesta deduce una delegación de puerto a parte', () => {
    let diagram = withNode(base('composite'), 'p', 'port', 'HTTP');
    diagram = withNode(diagram, 'part', 'part', 'controlador: Controller');
    expect(compositeModule.resolveConnection(diagram, 'p', 'part')).toEqual({ allowed: true, edgeType: 'delegationConnector' });
    expect(compositeModule.resolveConnection(diagram, 'part', 'p').allowed).toBe(false);
  });

  it('comunicación detecta mensajes sin número y numera la narración', () => {
    let diagram = withNode(base('communication'), 'a', 'communicationActor', 'Usuario');
    diagram = withNode(diagram, 'b', 'communicationParticipant', 'portal: Portal');
    diagram = addEdge(diagram, { id: 'e', artifactType: 'numberedMessage', sourceId: 'a', targetId: 'b', label: 'iniciar()', guard: null, ...DEFAULT_EDGE_SHAPE, props: {} });
    expect(validateDiagram(diagram, communicationModule.rules).some((problem) => problem.ruleId === 'communication.message-number')).toBe(true);
    diagram = { ...diagram, edges: diagram.edges.map((edge) => ({ ...edge, label: '1: iniciar()' })) };
    expect(communicationModule.narrate(diagram)[1]?.text).toContain('1: iniciar()');
  });

  it('interacción general exige un único inicio y salidas etiquetadas', () => {
    expect(validateDiagram(base('interactionOverview'), interactionOverviewModule.rules).some((problem) => problem.ruleId === 'interactionOverview.start-count')).toBe(true);
    const template = interactionOverviewModule.templates[0]!.diagram;
    const broken = {
      ...template,
      edges: template.edges.map((edge) => (edge.label === 'sí' ? { ...edge, label: '' } : edge)).filter((edge) => edge.label !== 'no'),
    };
    expect(validateDiagram(broken, interactionOverviewModule.rules).some((problem) => problem.ruleId === 'interactionOverview.decision-branches')).toBe(true);
  });

  it('tiempos solo conecta estados mediante eventos', () => {
    let diagram = withNode(base('timing'), 'a', 'timingLifeline', 'A');
    diagram = withNode(diagram, 'b', 'timingLifeline', 'B');
    expect(timingModule.resolveConnection(diagram, 'a', 'b').allowed).toBe(false);
  });

  it('los seis módulos ya no se marcan como vista previa y tienen propiedades propias', () => {
    for (const module of modules) {
      expect(module.maturity).toBeUndefined();
      expect(Object.values(module.nodeKinds).some((kind) => kind.properties.length > 0)).toBe(true);
      expect(module.templates).toHaveLength(6);
      expect(new Set(module.templates.map((template) => template.id)).size).toBe(6);
    }
    expect(new Set(objectModule.templates.map((template) => template.diagram.nodes.length)).size).toBeGreaterThan(1);
    expect(communicationModule.templates.some((template) => template.diagram.edges.some((edge) => edge.label.includes('.')))).toBe(true);
    expect(new Set(timingModule.templates.map((template) => template.diagram.nodes.length)).size).toBeGreaterThan(1);
  });

  it('los seis módulos generan narraciones y talleres específicos', () => {
    for (const module of modules) {
      const template = module.templates[0]!.diagram;
      expect(module.rules.length).toBeGreaterThan(4);
      expect(module.narrate(template).length).toBeGreaterThan(1);
      expect(module.guide.workshop?.correctionChallenges[0]?.diagram.id).not.toBe(template.id);
      expect(module.guide.workshop?.briefExercises.length).toBeGreaterThan(0);
      expect(module.guide.workshop?.comparisons.length).toBeGreaterThan(0);
    }
  });
});
