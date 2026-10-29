/** Identificador único (UUID v4) usando la API nativa del navegador/Node. */
export function createId(): string {
  return crypto.randomUUID();
}
