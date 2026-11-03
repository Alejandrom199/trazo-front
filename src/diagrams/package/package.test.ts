import { describe, expect, it } from 'vitest';
import type { Diagram } from '@/core/model';
import { resolvePackageConnection } from './connections';
import { packageRules } from './rules';
import { packageTemplates } from './templates';
import { createPackageTemplateBuilder } from './templates/templateBuilder';

const issues = (diagram: Diagram) => packageRules.flatMap((rule) => rule.check(diagram)).map((issue) => issue.ruleId);
const build = (draw: (b: ReturnType<typeof createPackageTemplateBuilder>) => void) => {
  const b = createPackageTemplateBuilder();
  draw(b);
  return b.build({ id: 't', name: 't', description: '', difficulty: 'básico', learningGoals: [] }).diagram;
};
const box = { width: 300, height: 200 };

describe('dependencias entre paquetes', () => {
  it('Dados A → B y B → A, Entonces hay un ciclo', () => {
    const diagram = build((b) => {
      const a = b.pkg('A', { x: 0, y: 0 }, box);
      const other = b.pkg('B', { x: 500, y: 0 }, box);
      b.connect(a, other);
      b.connect(other, a);
    });
    expect(issues(diagram)).toContain('package.cycle');
  });

  it('Dadas dependencias entre clases de paquetes distintos, Entonces el ciclo se detecta entre sus paquetes', () => {
    const diagram = build((b) => {
      const a = b.pkg('A', { x: 0, y: 0 }, box);
      const other = b.pkg('B', { x: 500, y: 0 }, box);
      b.connect(b.element('X', { x: 40, y: 60 }, a), other);
      b.connect(b.element('Y', { x: 40, y: 60 }, other), a);
    });
    expect(issues(diagram)).toContain('package.cycle');
  });

  it('Dadas capas en un solo sentido, Entonces no hay ciclo', () => {
    const diagram = build((b) => {
      const a = b.pkg('A', { x: 0, y: 0 }, box);
      const middle = b.pkg('B', { x: 500, y: 0 }, box);
      const c = b.pkg('C', { x: 1000, y: 0 }, box);
      b.connect(a, middle);
      b.connect(middle, c);
    });
    expect(issues(diagram)).not.toContain('package.cycle');
  });

  it('Dado un elemento dentro de un paquete, Entonces no puede depender de su propio paquete', () => {
    const diagram = build((b) => void b.element('X', { x: 40, y: 60 }, b.pkg('A', { x: 0, y: 0 }, box)));
    const [pkg, element] = diagram.nodes;
    expect(resolvePackageConnection(diagram, element!.id, pkg!.id)).toMatchObject({ allowed: false });
  });

  it('Dado un elemento suelto habiendo paquetes, Entonces se informa', () => {
    const diagram = build((b) => {
      b.pkg('A', { x: 0, y: 0 }, box);
      b.element('Suelto', { x: 500, y: 0 });
    });
    expect(issues(diagram)).toContain('package.loose-element');
  });
});

describe('ejemplos de paquetes', () => {
  it.each(packageTemplates)('$name: no tiene advertencias ni errores', (template) => {
    const found = packageRules.flatMap((rule) => rule.check(template.diagram)).filter((issue) => issue.severity !== 'info');
    expect(found.map((issue) => issue.message)).toEqual([]);
  });
});
