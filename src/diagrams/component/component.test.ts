import { describe, expect, it } from 'vitest';
import { validateDiagram, type Template } from '@/core/model';
import { ComponentArtifact as C } from './artifactTypes';
import { resolveComponentConnection } from './connections';
import { narrateComponents } from './narrator';
import { componentRules } from './rules';
import { componentTemplates } from './templates';
import { createComponentTemplateBuilder } from './templates/templateBuilder';

const info = { id: 'prueba', name: 'Prueba', description: '', difficulty: 'básico', learningGoals: [] } satisfies Omit<Template, 'diagram' | 'diagramType'>;
const ruleIds = (template: Template) => validateDiagram(template.diagram, componentRules).map((issue) => issue.ruleId);

describe('plantillas de componentes', () => {
  it.each(componentTemplates)('$name no tiene errores ni advertencias', (template) => {
    expect(validateDiagram(template.diagram, componentRules).filter((issue) => issue.severity !== 'info')).toEqual([]);
  });

  it.each(componentTemplates)('$name contiene cada artefacto que dice enseñar', (template) => {
    const used = new Set([...template.diagram.nodes, ...template.diagram.edges].map((element) => element.artifactType));
    for (const goal of template.learningGoals) expect(used, goal).toContain(goal);
  });
});

describe('conexiones', () => {
  it('Dados componente e interfaces, Entonces deduce provisión, requerimiento, ensamble y dependencia', () => {
    const b = createComponentTemplateBuilder();
    const a = b.component('A', { x: 0, y: 0 });
    const z = b.component('Z', { x: 400, y: 0 });
    const offers = b.provided('I', 300, 0);
    const needs = b.required('I', 200, 0);
    const { diagram } = b.build(info);

    expect(resolveComponentConnection(diagram, z, offers)).toEqual({ allowed: true, edgeType: C.provision });
    expect(resolveComponentConnection(diagram, a, needs)).toEqual({ allowed: true, edgeType: C.requirement });
    expect(resolveComponentConnection(diagram, needs, offers)).toEqual({ allowed: true, edgeType: C.assembly });
    expect(resolveComponentConnection(diagram, a, z)).toEqual({ allowed: true, edgeType: C.dependency });
    expect(resolveComponentConnection(diagram, offers, offers)).toMatchObject({ allowed: false });
  });
});

describe('reglas', () => {
  it('Dada una necesidad sin ensamble, Entonces avisa que nadie la cubre', () => {
    const b = createComponentTemplateBuilder();
    const a = b.component('A', { x: 0, y: 0 });
    b.connect(a, b.required('IPagos', 240, 0));
    expect(ruleIds(b.build(info))).toContain('component.required-unsatisfied');
  });

  it('Dado un ciclo que pasa por un ensamble, Entonces lo detecta', () => {
    const b = createComponentTemplateBuilder();
    const a = b.component('A', { x: 0, y: 0 });
    const z = b.component('Z', { x: 500, y: 0 });
    const needs = b.required('I', 240, 0);
    const offers = b.provided('I', 320, 0);
    b.connect(a, needs);
    b.connect(needs, offers);
    b.connect(z, offers);
    b.connect(z, a); // Z usa A, y A necesita lo que ofrece Z
    expect(ruleIds(b.build(info))).toContain('component.dependency-cycle');
  });
});

describe('narración', () => {
  it('Dada la tienda en línea, Entonces cuenta qué ofrece y necesita cada pieza y quién lo cubre', () => {
    const texts = narrateComponents(componentTemplates.find((template) => template.id === 'component.online-store')!.diagram).map((line) => line.text);
    expect(texts[0]).toBe('El sistema se divide en 3 componentes: «Tienda web», «Pedidos» y «Pagos».');
    expect(texts).toContain('«Tienda web» obtiene «IPedidos» de «Pedidos».');
  });
});
