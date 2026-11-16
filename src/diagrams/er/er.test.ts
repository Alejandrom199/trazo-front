import { describe, expect, it } from 'vitest';
import { validateDiagram } from '@/core/model';
import { createRegistry } from '@/core/registry';
import { erModule } from '.';
import { ErArtifact as E } from './artifactTypes';
import { resolveErConnection } from './connections';
import { narrateEr } from './narrator';
import { erRules } from './rules';
import { erTemplates } from './templates';
import { createErTemplateBuilder } from './templates/templateBuilder';

const info = { id: 't', name: 't', description: '', difficulty: 'básico' as const, learningGoals: [] };
const at = { x: 0, y: 0 };
const ruleIds = (diagram: Parameters<typeof validateDiagram>[0]) => validateDiagram(diagram, erRules).map((issue) => issue.ruleId);

describe('diagrama entidad-relación', () => {
  it('se registra y sus ejemplos no contienen problemas serios', () => {
    const registry = createRegistry();
    registry.register(erModule);
    expect(registry.get('er')).toBe(erModule);
    for (const template of erTemplates) {
      expect(validateDiagram(template.diagram, erRules).filter((issue) => issue.severity !== 'info')).toEqual([]);
    }
  });

  it('cada ejemplo utiliza los artefactos que anuncia enseñar', () => {
    for (const template of erTemplates) {
      const used = new Set([...template.diagram.nodes, ...template.diagram.edges].map((element) => element.artifactType));
      for (const goal of template.learningGoals) expect(used).toContain(goal);
    }
  });

  it('deduce la conexión de los extremos y rechaza unir entidades sin rombo', () => {
    const b = createErTemplateBuilder();
    const customer = b.entity('Cliente', at);
    const order = b.entity('Pedido', at);
    const places = b.relationship('realiza', at);
    const [name] = b.attributes(customer, ['nombre']);
    const diagram = b.build(info).diagram;

    expect(resolveErConnection(diagram, customer, places)).toEqual({ allowed: true, edgeType: E.participation });
    expect(resolveErConnection(diagram, customer, order)).toMatchObject({ allowed: false });
    expect(resolveErConnection(diagram, name!, order)).toEqual({ allowed: true, edgeType: E.attributeLink });
    expect(resolveErConnection(diagram, name!, customer)).toMatchObject({ allowed: false });
  });

  it('Dada una relación recursiva, Entonces admite dos participaciones de la misma entidad y no una tercera', () => {
    const b = createErTemplateBuilder();
    const employee = b.entity('Empleado', at);
    const supervises = b.relationship('supervisa', at);
    b.join(employee, supervises, '(0,1)');
    b.join(employee, supervises, '(0,N)');
    expect(resolveErConnection(b.build(info).diagram, employee, supervises)).toMatchObject({ allowed: false });
  });

  it('Dada una entidad sin clave y una débil sin dueño, Entonces las reglas lo avisan', () => {
    const b = createErTemplateBuilder();
    const order = b.entity('Pedido', at);
    const line = b.weakEntity('Línea', at);
    const has = b.relationship('tiene', at);
    b.join(order, has, '(1,N)');
    b.join(line, has, '');
    expect(ruleIds(b.build(info).diagram)).toEqual(expect.arrayContaining([
      'er.weak-entity-without-owner',
      'er.entity-without-key',
      'er.participation-without-cardinality',
    ]));
  });

  it('Dadas una relación incompleta, un atributo suelto y una entidad repetida, Entonces las reglas lo avisan', () => {
    const b = createErTemplateBuilder();
    const first = b.entity('Cliente', at);
    b.entity('cliente', at);
    const buys = b.relationship('compra', at);
    b.join(first, buys, '(0,N)');
    const ids = ruleIds(b.build(info).diagram);
    expect(ids).toEqual(expect.arrayContaining(['er.relationship-arity', 'er.duplicate-entity']));
  });

  it('narra entidades con su clave y las relaciones con sus cardinalidades', () => {
    const lines = narrateEr(erTemplates.find((template) => template.id === 'er.store')!.diagram).map((line) => line.text);
    expect(lines[0]).toBe('El modelo guarda datos de 2 entidades: «Cliente» y «Pedido».');
    expect(lines).toContain('«Cliente» se identifica por «id_cliente» y guarda «nombre» y «correo».');
    expect(lines).toContain('La relación «realiza» relaciona «Cliente» (0,N) y «Pedido» (1,1).');
  });
});
