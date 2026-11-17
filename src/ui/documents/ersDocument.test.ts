import { describe, expect, it } from 'vitest';
import { diagramRegistry } from '@/core/registry';
import { registerDiagramModules } from '@/diagrams';
import { buildSampleProject } from '@/diagrams/sampleProject';
import { buildErsHtml, toWordDocument } from './ersDocument';

if (!diagramRegistry.has('activity')) registerDiagramModules(diagramRegistry);

let counter = 0;
const sample = buildSampleProject(() => `id${++counter}`, new Date(0));
const project = { ...sample.project, id: 'p', createdAt: '', updatedAt: '' };
const loan = sample.diagrams.find((diagram) => diagram.name === 'Pedir un préstamo')!;

describe('documento ERS', () => {
  const html = buildErsHtml({ project, diagrams: sample.diagrams, images: { [loan.id]: 'data:image/png;base64,QUJD' }, date: new Date(2026, 10, 17) });

  it('Dado el proyecto de ejemplo, Entonces reúne requisitos, casos de uso, modelos, matriz y pruebas', () => {
    for (const expected of ['Biblioteca Digital', '2.1 Requisitos funcionales', 'RF-01', 'RN-01', '3.1 Listado de casos de uso', 'CU02', 'Curso típico de eventos', '4.', 'Pedir un préstamo', 'CP-01', 'Sin cubrir', '5. Matriz de trazabilidad']) {
      expect(html).toContain(expected);
    }
    // RF-04 está propuesto y sin cubrir ni probar.
    expect(html).toMatch(/RF-04<\/td><td>Avisar la fecha de devolución<\/td><td>Sin cubrir<\/td><td>Sin probar/);
    expect(html).toContain('<img src="data:image/png;base64,QUJD"');
  });

  it('Dado el documento con imágenes, Entonces el .doc las adjunta para que Word las muestre', () => {
    const doc = toWordDocument(html);
    expect(doc).toContain('Content-Type: multipart/related');
    expect(doc).toContain('src="file:///C:/ers/imagen1.png"');
    expect(doc).toContain('Content-Location: file:///C:/ers/imagen1.png\r\n\r\nQUJD');
    expect(doc).not.toContain('data:image/png');
  });
});
