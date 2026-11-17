/** Escapa texto para meterlo en HTML copiado. */
export const escapeHtml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Copia una tabla HTML, con su versión en texto, para pegarla en Word o Google
 * Docs. Sin permiso (o sin soporte de HTML) copia solo el texto. Devuelve si pudo.
 */
export async function copyTable(html: string, text: string): Promise<boolean> {
  try {
    if ('ClipboardItem' in window) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
    } else {
      await navigator.clipboard.writeText(text);
    }
    return true;
  } catch {
    return false;
  }
}
