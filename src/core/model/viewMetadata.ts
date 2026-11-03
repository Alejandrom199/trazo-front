/**
 * Metadatos opcionales de un elemento (en sus props). No cambian su semántica UML.
 * linkedTemplateId: el ejemplo que detalla este elemento (p. ej. una acción
 * «Autorizar pago» enlaza al diagrama de secuencia que la explica).
 */
export const LINKED_TEMPLATE_ID_KEY = 'linkedTemplateId';

export function linkedTemplateId(props: Record<string, unknown>): string | null {
  const value = props[LINKED_TEMPLATE_ID_KEY];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
