import { describe, expect, it } from 'vitest';
import { createRegistry } from '@/core/registry';
import { activityModule } from '.';
import { activityArtifacts } from './artifacts';
import { ActivityArtifact } from './artifactTypes';

describe('catálogo del diagrama de actividades', () => {
  it('Contiene todos los artefactos del MVP', () => {
    expect(activityArtifacts.map((artifact) => artifact.type).sort()).toEqual(
      Object.values(ActivityArtifact).sort(),
    );
  });

  it.each(activityArtifacts)('$name tiene su conocimiento completo', (artifact) => {
    for (const text of [artifact.name, artifact.umlName, artifact.notation, artifact.whatIs, artifact.whatFor, artifact.whyExists, artifact.example]) {
      expect(text.trim()).not.toBe('');
    }
    for (const list of [artifact.whenToUse, artifact.whenNotToUse, artifact.rules, artifact.commonMistakes]) {
      expect(list.length).toBeGreaterThan(0);
    }
  });

  it('Cada artefacto es nodo o conexión, nunca ambos ni ninguno', () => {
    for (const artifact of activityArtifacts) {
      const isNode = artifact.type in activityModule.nodeKinds;
      const isEdge = artifact.type in activityModule.edgeKinds;
      expect(isNode !== isEdge, artifact.type).toBe(true);
    }
  });

  it('El módulo pasa las comprobaciones de coherencia del registro', () => {
    expect(() => createRegistry().register(activityModule)).not.toThrow();
  });
});
