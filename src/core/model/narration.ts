/**
 * Resultado del narrador: líneas de texto en orden de lectura.
 * Cada línea recuerda qué elementos describe para poder resaltarlos.
 */
export interface NarrationLine {
  text: string;
  /** Nivel de anidamiento (0 = flujo principal; cada rama de decisión o fork suma 1). */
  depth: number;
  nodeIds: string[];
  edgeIds: string[];
}

export type Narration = NarrationLine[];
