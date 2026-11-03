import { beforeAll, describe, expect, it } from 'vitest';
import { createEmptyDiagram } from '@/core/model';
import { diagramRegistry } from '@/core/registry';
import { registerDiagramModules } from '@/diagrams';
import { diagramFromJson, diagramToJson, toFileName } from './fileTransfer';

beforeAll(() => {
  if (!diagramRegistry.has('activity')) registerDiagramModules(diagramRegistry);
});

describe('toFileName', () => {
  it.each([
    ['Pedido online', 'pedido-online'],
    ['Aprobación de documento', 'aprobacion-de-documento'],
    ['  ¡Hola!  ', 'hola'],
    ['', 'diagrama'],
  ])('«%s» → %s', (name, expected) => expect(toFileName(name)).toBe(expected));
});

describe('diagramFromJson', () => {
  it('Dado un JSON exportado, Entonces se importa como copia con id nuevo', () => {
    const original = createEmptyDiagram({ diagramType: 'activity', name: 'Mío' });

    const result = diagramFromJson(diagramToJson(original), new Date('2026-10-28T00:00:00.000Z'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diagram.name).toBe('Mío');
    expect(result.diagram.id).not.toBe(original.id);
    expect(result.diagram.updatedAt).toBe('2026-10-28T00:00:00.000Z');
  });

  it('Dado un texto que no es JSON, Entonces explica el error', () => {
    expect(diagramFromJson('no soy json')).toEqual({ ok: false, error: 'El archivo no es un JSON válido.' });
  });

  it('Dado un tipo de diagrama desconocido, Entonces lo rechaza', () => {
    const foreign = { ...createEmptyDiagram({ diagramType: 'activity', name: 'x' }), diagramType: 'timing' };

    expect(diagramFromJson(JSON.stringify(foreign))).toMatchObject({ ok: false });
  });
});
