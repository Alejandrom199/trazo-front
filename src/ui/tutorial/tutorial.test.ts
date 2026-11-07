import { describe, expect, it } from 'vitest';
import { tutorialStepDone, type TutorialSnapshot } from './tutorial';

const base: TutorialSnapshot = { nodeCount: 1, edgeCount: 0, labelSignature: 'a:Inicio', issueCount: 1, inspectorTab: 'properties', exportOnStep: null };

describe('recorrido del editor', () => {
  it('avanza al agregar una figura, renombrar y conectar', () => {
    expect(tutorialStepDone(0, base, { ...base, nodeCount: 2 })).toBe(true);
    expect(tutorialStepDone(1, base, { ...base, labelSignature: 'a:Pedir' })).toBe(true);
    expect(tutorialStepDone(1, base, { ...base, labelSignature: 'a:Inicio|b:Nueva', nodeCount: 2 })).toBe(false);
    expect(tutorialStepDone(2, base, { ...base, edgeCount: 1 })).toBe(true);
  });

  it('pide corregir un problema si hay avisos, o abrir Problemas si el diagrama está limpio', () => {
    expect(tutorialStepDone(3, base, { ...base, issueCount: 0 })).toBe(true);
    expect(tutorialStepDone(3, { ...base, issueCount: 0 }, { ...base, issueCount: 0, inspectorTab: 'problems' })).toBe(true);
    expect(tutorialStepDone(3, { ...base, issueCount: 0 }, { ...base, issueCount: 0, inspectorTab: 'properties' })).toBe(false);
  });

  it('termina al narrar y exportar en el paso correspondiente', () => {
    expect(tutorialStepDone(4, base, { ...base, inspectorTab: 'narration' })).toBe(true);
    expect(tutorialStepDone(5, base, { ...base, exportOnStep: 4 })).toBe(false);
    expect(tutorialStepDone(5, base, { ...base, exportOnStep: 5 })).toBe(true);
  });
});
