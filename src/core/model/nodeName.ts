import type { DiagramNode } from './diagram';

/**
 * Nombre de un nodo para mostrarlo en una línea: la primera línea no vacía de su
 * etiqueta. En una clase, la etiqueta trae debajo atributos y operaciones; aquí
 * solo interesa el nombre. `fallback` cuando no tiene nombre.
 */
export function nodeName(node: Pick<DiagramNode, 'label'> | undefined, fallback = 'sin nombre'): string {
  const firstLine = node?.label.split('\n').find((line) => line.trim() !== '');
  return firstLine?.trim() || fallback;
}
