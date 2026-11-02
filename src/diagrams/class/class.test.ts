import { describe, expect, it } from 'vitest';
import { validateDiagram } from '@/core/model';
import { createRegistry } from '@/core/registry';
import { ClassArtifact as C } from './artifactTypes';
import { classModule } from '.';
import { resolveClassConnection } from './connections';
import { narrateClass } from './narrator';
import { classRules } from './rules';
import { classTemplates } from './templates';
import { createClassTemplateBuilder } from './templates/templateBuilder';

describe('módulo de diagrama de clases', () => {
  it('se registra y sus ejemplos no contienen problemas serios', () => {
    const registry = createRegistry();
    registry.register(classModule);

    expect(registry.get('class')).toBe(classModule);
    for (const template of classTemplates) {
      expect(validateDiagram(template.diagram, classRules).filter((issue) => issue.severity !== 'info')).toEqual([]);
    }
  });

  it('cada ejemplo utiliza los artefactos que anuncia enseñar', () => {
    for (const template of classTemplates) {
      const used = new Set([...template.diagram.nodes, ...template.diagram.edges].map((element) => element.artifactType));
      for (const goal of template.learningGoals) expect(used).toContain(goal);
    }
  });

  it('propone asociaciones entre clasificadores y no conecta paquetes', () => {
    const builder = createClassTemplateBuilder();
    const customer = builder.classifier(C.class, 'Cliente', { x: 0, y: 0 });
    const order = builder.classifier(C.class, 'Pedido', { x: 300, y: 0 });
    const domain = builder.package('Dominio', { x: 0, y: 240 }, { width: 500, height: 300 });
    const diagram = builder.build({ id: 'test', name: 'test', description: '', difficulty: 'básico', learningGoals: [] }).diagram;

    expect(resolveClassConnection(diagram, customer, order)).toEqual({ allowed: true, edgeType: C.association });
    expect(resolveClassConnection(diagram, domain, customer)).toMatchObject({ allowed: false });
  });

  it('narra la intención estructural de una relación', () => {
    const narration = narrateClass(classTemplates[1]!.diagram).map((line) => line.text).join('\n');
    expect(narration).toContain('«Pedido» compone a «LineaPedido»');
  });
});
