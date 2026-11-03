import { describe, expect, it } from 'vitest';
import { UML_DIAGRAMS, umlKindOf } from '@/core/model';
import { createRegistry } from '@/core/registry';
import { registerDiagramModules } from '.';

const registry = createRegistry();
registerDiagramModules(registry);

describe('todos los módulos', () => {
  it.each(registry.list())('$displayName: todo artefacto se puede redimensionar desde sus bordes', (module) => {
    const fixed = Object.entries(module.nodeKinds).filter(([, kind]) => !kind.resizable).map(([type]) => type);
    expect(fixed).toEqual([]);
  });

  it.each(registry.list())('$displayName: tiene al menos seis ejemplos, de distintas dificultades', (module) => {
    expect(module.templates.length).toBeGreaterThanOrEqual(6);
    expect(new Set(module.templates.map((template) => template.difficulty)).size).toBe(3);
  });
});

describe('clasificación UML', () => {
  it('Dado UML 2.5, Entonces hay 14 diagramas: 7 de estructura y 7 de comportamiento (4 de interacción)', () => {
    expect(UML_DIAGRAMS.filter((kind) => kind.family === 'structure')).toHaveLength(7);
    expect(UML_DIAGRAMS.filter((kind) => kind.family === 'behavior')).toHaveLength(7);
    expect(UML_DIAGRAMS.filter((kind) => kind.interaction)).toHaveLength(4);
  });

  it.each(registry.list())('$displayName: está en la clasificación UML', (module) => {
    expect(umlKindOf(module.diagramType)).toBeDefined();
  });
});
