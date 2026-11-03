import { describe, expect, it } from 'vitest';
import { createRegistry } from '@/core/registry';
import { registerDiagramModules } from '.';

const registry = createRegistry();
registerDiagramModules(registry);

describe('todos los módulos', () => {
  it.each(registry.list())('$displayName: todo artefacto se puede redimensionar desde sus bordes', (module) => {
    const fixed = Object.entries(module.nodeKinds).filter(([, kind]) => !kind.resizable).map(([type]) => type);
    expect(fixed).toEqual([]);
  });
});
