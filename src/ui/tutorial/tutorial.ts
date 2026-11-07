/** Condición de cada paso del recorrido, independiente de React. */

export interface TutorialSnapshot {
  nodeCount: number;
  edgeCount: number;
  labelSignature: string;
  issueCount: number;
  inspectorTab: string | null;
  exportOnStep: number | null;
}

export const TUTORIAL_STEPS = [
  { title: 'Agrega una figura', body: 'Elige un artefacto en la paleta de la izquierda y suéltalo en el lienzo.' },
  { title: 'Cámbiale el nombre', body: 'Haz doble clic en una figura con texto y escribe un nombre que diga qué representa. Un nodo inicial no lleva nombre: usa una acción, una clase o un caso de uso.' },
  { title: 'Conecta dos elementos', body: 'Arrastra desde el borde de una figura hasta otra.' },
  { title: 'Corrige un problema', body: 'Abre Problemas en el inspector. Si hay avisos, corrige uno; si no hay, ya puedes seguir.' },
  { title: 'Abre la narración', body: 'En el inspector, elige Narración para oír el diagrama paso a paso.' },
  { title: 'Exporta el resultado', body: 'En Archivo, exporta el diagrama como JSON o como imagen.' },
] as const;

function labelsById(signature: string): Map<string, string> {
  const labels = new Map<string, string>();
  if (!signature) return labels;
  for (const part of signature.split('|')) {
    const split = part.indexOf(':');
    if (split <= 0) continue;
    labels.set(part.slice(0, split), part.slice(split + 1));
  }
  return labels;
}

/** Un nombre cambió en una figura que ya estaba. Agregar otra no cuenta. */
function renamedExisting(before: string, after: string): boolean {
  const previous = labelsById(before);
  const current = labelsById(after);
  for (const [id, label] of previous) {
    const next = current.get(id);
    if (next !== undefined && next !== label) return true;
  }
  return false;
}

export function tutorialStepDone(step: number, start: TutorialSnapshot, now: TutorialSnapshot): boolean {
  switch (step) {
    case 0:
      return now.nodeCount > start.nodeCount;
    case 1:
      return renamedExisting(start.labelSignature, now.labelSignature);
    case 2:
      return now.edgeCount > start.edgeCount;
    case 3:
      return start.issueCount > 0 ? now.issueCount < start.issueCount : now.inspectorTab === 'problems';
    case 4:
      return now.inspectorTab === 'narration';
    case 5:
      return now.exportOnStep === 5;
    default:
      return false;
  }
}
