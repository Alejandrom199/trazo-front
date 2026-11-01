import type { ArtifactDefinition } from '@/core/model';

/**
 * Búsqueda de artefactos para la paleta y el menú del lienzo. Sin acentos ni
 * mayúsculas ("decision" encuentra "Nodo de decisión"), y cada palabra escrita
 * debe aparecer en algún lado. Orden: primero los que coinciden por el nombre,
 * luego por el nombre UML y al final por la descripción; dentro de cada grupo
 * se respeta el orden del catálogo.
 */

/** Texto comparable: minúsculas y sin tildes. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/** Qué tan buena es una coincidencia: menor es mejor. */
const Match = { NameStart: 0, Name: 1, UmlName: 2, Description: 3 } as const;
type Match = (typeof Match)[keyof typeof Match];

export function searchArtifacts(artifacts: readonly ArtifactDefinition[], query: string): ArtifactDefinition[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...artifacts];

  return artifacts
    .map((artifact, order) => ({ artifact, order, match: matchOf(artifact, words) }))
    .filter((entry): entry is { artifact: ArtifactDefinition; order: number; match: Match } => entry.match !== null)
    .sort((a, b) => a.match - b.match || a.order - b.order)
    .map((entry) => entry.artifact);
}

function matchOf(artifact: ArtifactDefinition, words: string[]): Match | null {
  const name = normalize(artifact.name);
  const umlName = normalize(artifact.umlName);
  const everything = [name, umlName, normalize(artifact.category), normalize(artifact.whatIs)].join(' ');
  if (!words.every((word) => everything.includes(word))) return null;

  if (words.every((word) => name.includes(word))) {
    const startsWord = name.split(/\s+/).some((part) => part.startsWith(words[0]!));
    return startsWord ? Match.NameStart : Match.Name;
  }
  if (words.every((word) => umlName.includes(word))) return Match.UmlName;
  return Match.Description;
}
