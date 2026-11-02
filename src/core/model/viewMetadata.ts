/** Metadatos opcionales de presentación. No cambian la semántica UML del elemento. */
export const CANVAS_VIEW_ROLE_KEY = 'canvasViewRole';
export const LINKED_TEMPLATE_ID_KEY = 'linkedTemplateId';

export type CanvasViewRole = 'primary' | 'alternative' | 'integration';

export function canvasViewRole(props: Record<string, unknown>): CanvasViewRole | null {
  const value = props[CANVAS_VIEW_ROLE_KEY];
  return value === 'primary' || value === 'alternative' || value === 'integration' ? value : null;
}

export function linkedTemplateId(props: Record<string, unknown>): string | null {
  const value = props[LINKED_TEMPLATE_ID_KEY];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
