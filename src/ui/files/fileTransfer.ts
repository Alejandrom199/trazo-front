import { createId } from '@/core/utils/id';
import { parseDiagram, type ParseResult } from '@/core/persistence/diagramFormat';
import { diagramRegistry } from '@/core/registry';
import type { Diagram } from '@/core/model';

/** Nombre de archivo seguro a partir del nombre del diagrama: "Pedido online" → "pedido-online". */
export function toFileName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'diagrama';
}

export function diagramToJson(diagram: Diagram): string {
  return JSON.stringify(diagram, null, 2);
}

/**
 * Lee un JSON importado. Etapas: parsear → validar y migrar el formato → comprobar
 * que el tipo de diagrama existe → darle un id nuevo (importar es crear una copia:
 * nunca pisa un diagrama guardado con el mismo id).
 */
export function diagramFromJson(text: string, now: Date = new Date()): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' };
  }
  const result = parseDiagram(raw);
  if (!result.ok) return result;
  if (!diagramRegistry.has(result.diagram.diagramType)) {
    return { ok: false, error: `Trazo no conoce el tipo de diagrama "${result.diagram.diagramType}".` };
  }
  return { ok: true, diagram: { ...result.diagram, id: createId(), updatedAt: now.toISOString() } };
}

/** Dispara la descarga de un archivo en el navegador. */
export function downloadUrl(url: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
}

export function downloadText(text: string, fileName: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  downloadUrl(url, fileName);
  // Se libera después: algunos navegadores leen la URL de forma asíncrona tras el clic.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
