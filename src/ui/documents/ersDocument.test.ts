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

  it('Dado el proyecto de ejemplo, Entonces sigue los capítulos de la plantilla IEEE 830 y reúne lo del modelo', () => {
    for (const expected of ['Biblioteca Digital', '1.3 Audiencia', '2.1.1 Planteamiento del problema', '3.3 Reglas y funciones de negocio', '4.1 Requerimientos funcionales', '4.2.1 Del producto', 'RF-01', 'RN-01', 'ACT-1', '5.3 Listado de casos de uso', 'CU02', 'Curso típico de eventos', 'DG-2 Pedir un préstamo', '8.1 Trazabilidad de requisitos', '8.2 Trazabilidad de casos de uso', '12. Observaciones', 'Anexo A. Casos de prueba', 'CP-01']) {
      expect(html).toContain(expected);
    }
    // RF-04 está propuesto y sin cubrir ni probar.
    expect(html).toMatch(/RF-04<\/td><td>Avisar la fecha de devolución<\/td><td>Sin cubrir<\/td><td>Sin probar/);
    expect(html).toContain('<img src="data:image/png;base64,QUJD"');
  });

  it('Dado el ejemplo con sus datos del documento y actores descritos, Entonces no queda nada «Por completar» y sin datos sí', () => {
    expect(html).not.toContain('class="pending"');
    expect(html).toContain('Biblioteca Municipal Central');
    const bare = buildErsHtml({ project: { ...project, document: undefined }, diagrams: sample.diagrams, images: {}, date: new Date(0) });
    expect(bare).toContain('<h4>2.1.1 Planteamiento del problema</h4><p class="pending">Por completar.</p>');
  });

  it('Dado el documento con imágenes, Entonces el .doc las adjunta para que Word las muestre', () => {
    const doc = toWordDocument(html);
    expect(doc).toContain('Content-Type: multipart/related');
    expect(doc).toContain('src="file:///C:/ers/imagen1.png"');
    expect(doc).toContain('Content-Location: file:///C:/ers/imagen1.png\r\n\r\nQUJD');
    expect(doc).not.toContain('data:image/png');
  });
});
