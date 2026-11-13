import { describe, expect, it } from 'vitest';
import { ClassArtifact as C } from '../artifactTypes';
import { createClassTemplateBuilder } from '../templates/templateBuilder';
import { generalizationCycle, sharedCompositePart } from './semantics';

const build = (setup: (b: ReturnType<typeof createClassTemplateBuilder>) => void) => {
  const b = createClassTemplateBuilder();
  setup(b);
  return b.build({ id: 't', name: 't', description: '', difficulty: 'básico', learningGoals: [] }).diagram;
};

describe('herencia circular', () => {
  it('Dada una jerarquía normal, Entonces no hay problema', () => {
    const diagram = build((b) => {
      const animal = b.classifier(C.abstractClass, 'Animal', { x: 0, y: 0 });
      b.relation(b.classifier(C.class, 'Perro', { x: 0, y: 200 }), animal, C.generalization);
      b.relation(b.classifier(C.class, 'Gato', { x: 300, y: 200 }), animal, C.generalization);
    });
    expect(generalizationCycle.check(diagram)).toEqual([]);
  });

  it('Dado un ciclo de tres clases, Entonces es un solo problema que las nombra a todas', () => {
    const diagram = build((b) => {
      const a = b.classifier(C.class, 'A', { x: 0, y: 0 });
      const bb = b.classifier(C.class, 'B', { x: 300, y: 0 });
      const c = b.classifier(C.class, 'C', { x: 600, y: 0 });
      b.relation(a, bb, C.generalization);
      b.relation(bb, c, C.generalization);
      b.relation(c, a, C.generalization);
    });
    const issues = generalizationCycle.check(diagram);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.nodeIds).toHaveLength(3);
    expect(issues[0]!.edgeIds).toHaveLength(3);
  });

  it('Dadas otras relaciones en ciclo (asociaciones), Entonces no cuentan como herencia', () => {
    const diagram = build((b) => {
      const a = b.classifier(C.class, 'A', { x: 0, y: 0 });
      const bb = b.classifier(C.class, 'B', { x: 300, y: 0 });
      const c = b.classifier(C.class, 'C', { x: 600, y: 0 });
      b.relation(a, bb, C.association);
      b.relation(bb, c, C.association);
      b.relation(c, a, C.association);
    });
    expect(generalizationCycle.check(diagram)).toEqual([]);
  });
});

describe('parte de varios todos', () => {
  it('Dada una parte compuesta por dos todos, Entonces avisa nombrando a ambos', () => {
    const diagram = build((b) => {
      const part = b.classifier(C.class, 'Dirección', { x: 300, y: 300 });
      b.relation(b.classifier(C.class, 'Cliente', { x: 0, y: 0 }), part, C.composition);
      b.relation(b.classifier(C.class, 'Proveedor', { x: 600, y: 0 }), part, C.composition);
    });
    const issues = sharedCompositePart.check(diagram);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('warning');
    expect(issues[0]!.message).toContain('«Cliente»');
    expect(issues[0]!.message).toContain('«Proveedor»');
  });

  it('Dada la parte de un todo y agregada en otro, Entonces no avisa: la agregación no posee', () => {
    const diagram = build((b) => {
      const part = b.classifier(C.class, 'Rueda', { x: 300, y: 300 });
      b.relation(b.classifier(C.class, 'Coche', { x: 0, y: 0 }), part, C.composition);
      b.relation(b.classifier(C.class, 'Almacén', { x: 600, y: 0 }), part, C.aggregation);
    });
    expect(sharedCompositePart.check(diagram)).toEqual([]);
  });
});
