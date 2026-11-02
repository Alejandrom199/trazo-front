/** Papel que cumple una línea dentro del recorrido narrado. */
export type NarrationKind =
  | 'start'
  | 'participants'
  | 'step'
  | 'decision'
  | 'branch'
  | 'parallel'
  | 'merge'
  | 'end'
  | 'warning';

/**
 * Resultado del narrador: líneas de texto en orden de lectura.
 * Cada línea recuerda qué elementos describe para poder resaltarlos.
 */
export interface NarrationLine {
  text: string;
  /** Función semántica de la frase; permite presentarla sin inferirla desde el texto. */
  kind: NarrationKind;
  /** Nivel de anidamiento (0 = flujo principal; cada rama de decisión o fork suma 1). */
  depth: number;
  nodeIds: string[];
  edgeIds: string[];
}

export type Narration = NarrationLine[];
