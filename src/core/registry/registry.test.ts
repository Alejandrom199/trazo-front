import { describe, expect, it } from 'vitest';
import type { ArtifactDefinition } from '@/core/model';
import type { DiagramModule } from './diagramModule';
import { createRegistry } from './registry';

function buildModule(overrides: Partial<DiagramModule> = {}): DiagramModule {
  return {
    diagramType: 'activity',
    displayName: 'Prueba',
    artifacts: [],
    nodeComponents: {},
    rules: [],
    narrate: () => [],
    templates: [],
    ...overrides,
  };
}

function buildArtifact(overrides: Partial<ArtifactDefinition> = {}): ArtifactDefinition {
  return {
    type: 'action',
    diagramType: 'activity',
    category: 'nodo ejecutable',
    name: 'Acción',
    umlName: 'Action',
    notation: '',
    whatIs: '',
    whatFor: '',
    whyExists: '',
    whenToUse: [],
    whenNotToUse: [],
    rules: [],
    commonMistakes: [],
    example: '',
    relatedArtifacts: [],
    connectionRules: { minIn: 0, maxIn: null, minOut: 0, maxOut: null },
    ...overrides,
  };
}

describe('registro de módulos', () => {
  it('Dado un módulo registrado, Entonces se puede obtener por su tipo', () => {
    const registry = createRegistry();
    const module = buildModule();

    registry.register(module);

    expect(registry.get('activity')).toBe(module);
    expect(registry.has('activity')).toBe(true);
    expect(registry.list()).toEqual([module]);
  });

  it('Dado un tipo no registrado, Entonces get lanza un error descriptivo', () => {
    const registry = createRegistry();

    expect(registry.has('sequence')).toBe(false);
    expect(() => registry.get('sequence')).toThrow(/sequence/);
  });

  it('Dado un tipo ya registrado, Entonces registrarlo de nuevo lanza error', () => {
    const registry = createRegistry();
    registry.register(buildModule());

    expect(() => registry.register(buildModule())).toThrow(/ya está registrado/);
  });

  it('Dado un artefacto de otro tipo de diagrama, Entonces el registro lo rechaza', () => {
    const registry = createRegistry();
    const module = buildModule({ artifacts: [buildArtifact({ diagramType: 'sequence' })] });

    expect(() => registry.register(module)).toThrow(/declara diagramType/);
  });

  it('Dados dos artefactos con la misma clave, Entonces el registro lo rechaza', () => {
    const registry = createRegistry();
    const module = buildModule({ artifacts: [buildArtifact(), buildArtifact()] });

    expect(() => registry.register(module)).toThrow(/duplicado/);
  });

  it('Dado un componente visual sin artefacto en el catálogo, Entonces el registro lo rechaza', () => {
    const registry = createRegistry();
    const module = buildModule({ nodeComponents: { ghost: () => null } });

    expect(() => registry.register(module)).toThrow(/ghost/);
  });
});
