/**
 * Resultado del narrador: líneas de texto en orden de lectura.
 * Cada línea recuerda qué elementos describe para poder resaltarlos.
 */
export interface NarrationLine {
  text: string;
  nodeIds: string[];
  edgeIds: string[];
}

export type Narration = NarrationLine[];
