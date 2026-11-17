import type { AlternateFlow, NumberedStep } from '@/diagrams/usecase/spec';
import { escapeHtml } from '@/ui/clipboard';

/**
 * Fichas como tablas HTML para documentos (Word, Google Docs, el ERS). Una sola
 * fuente: la usan «Copiar ficha» en el editor y el documento ERS.
 */

export const DOC_TABLE = 'border="1" cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:11pt;width:100%"';
const LABEL = 'style="background:#d9d9d9;font-weight:bold;width:30%"';
const BAND = 'style="background:#d9d9d9;font-weight:bold;text-align:center"';

export const htmlCell = (value: string | readonly string[]): string =>
  (Array.isArray(value) ? `<ul>${value.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : escapeHtml(value as string));

/** Ficha de requisito: una fila por campo. */
export function requirementSheetHtml(rows: readonly [string, string | string[]][]): string {
  return `<table ${DOC_TABLE}>${rows.map(([label, value]) => `<tr><td ${LABEL}>${escapeHtml(label)}:</td><td>${htmlCell(value)}</td></tr>`).join('')}</table>`;
}

/** Ficha de caso de uso: sus datos, el curso típico en dos columnas y el curso alterno. */
export function useCaseSheetHtml(
  rows: readonly [string, string | string[]][],
  pairs: readonly { actor?: NumberedStep; system?: NumberedStep }[],
  alternates: readonly AlternateFlow[],
): string {
  const step = (item?: NumberedStep) => (item ? `${item.number}. ${escapeHtml(item.text)}` : '');
  return `<table ${DOC_TABLE}>${rows.map(([label, value]) => `<tr><td ${LABEL}>${escapeHtml(label)}</td><td colspan="2">${htmlCell(value)}</td></tr>`).join('')}`
    + `<tr><td colspan="3" ${BAND}>Curso típico de eventos</td></tr><tr><td style="font-weight:bold;text-align:center">Acciones de los actores</td><td colspan="2" style="font-weight:bold;text-align:center">Respuesta del sistema</td></tr>`
    + (pairs.length > 0 ? pairs.map((pair) => `<tr><td>${step(pair.actor)}</td><td colspan="2">${step(pair.system)}</td></tr>`).join('') : '<tr><td colspan="3">—</td></tr>')
    + `<tr><td colspan="3" ${BAND}>Curso alterno de eventos</td></tr>`
    + (alternates.length > 0 ? alternates.map((flow) => `<tr><td style="text-align:center;font-weight:bold">${flow.step}.</td><td colspan="2">${escapeHtml(flow.text)}</td></tr>`).join('') : '<tr><td colspan="3">—</td></tr>')
    + '</table>';
}
