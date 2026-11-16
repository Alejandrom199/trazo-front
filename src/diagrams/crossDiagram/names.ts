import { nodeName, type DiagramNode } from '@/core/model';

/**
 * Cómo se reconocen los nombres de un mismo concepto en distintos diagramas.
 * Única fuente de verdad: las reglas de proyecto y las sugerencias de vínculos
 * comparan nombres con estas funciones, nunca con su propia variante.
 */

/**
 * Forma comparable de un nombre: sin mayúsculas, tildes, espacios ni signos.
 * «Servicio Préstamos», «servicioPrestamos» y «Servicio_préstamos» dan lo mismo.
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Tipo que representa una línea de vida: «:Catálogo» → «Catálogo»,
 * «portal: PortalWeb» → «PortalWeb». Sin dos puntos, la etiqueta entera es el
 * tipo. null si no se puede leer un tipo (etiqueta vacía o «portal:»).
 */
export function lifelineTypeName(label: string): string | null {
  const text = nodeName({ label }, '');
  const colon = text.indexOf(':');
  const type = (colon === -1 ? text : text.slice(colon + 1)).replace(/\[.*?\]/g, '').trim();
  return type || null;
}

/** Quita la visibilidad UML del principio (+ - # ~). */
const withoutVisibility = (text: string) => text.replace(/^[+\-#~]\s*/, '').trim();

/**
 * Nombre de la operación que invoca un mensaje, o null si el mensaje no es una
 * llamada (no tiene paréntesis, como «ejemplar disponible»). Ignora la
 * numeración («1.2: »), la guarda («[ok] ») y la asignación («p = crear()»).
 */
export function messageCallName(label: string): string | null {
  const open = label.indexOf('(');
  if (open === -1) return null;
  let head = label.slice(0, open);
  head = head.replace(/^\s*\d+(\.\d+)*\s*[:.]\s*/, '').replace(/\[.*?\]/g, '');
  const assignment = head.lastIndexOf('=');
  if (assignment !== -1) head = head.slice(assignment + 1);
  const name = withoutVisibility(head);
  return name || null;
}

/**
 * Operaciones declaradas en un clasificador: las líneas de la etiqueta, después
 * del nombre, que tienen paréntesis («+estaDisponible(): Boolean» → «estaDisponible»).
 */
export function classifierOperations(node: Pick<DiagramNode, 'label'>): string[] {
  return node.label
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.includes('('))
    .map((line) => withoutVisibility(line.slice(0, line.indexOf('('))))
    .filter((name) => name !== '');
}
