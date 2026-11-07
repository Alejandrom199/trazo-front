import { normalize } from '@/ui/palette/artifactSearch';

export interface CommandItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string;
}

/** Cada palabra de la consulta debe aparecer en el nombre, la pista o las palabras clave. */
export function filterCommands<T extends CommandItem>(items: readonly T[], query: string): T[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...items];
  return items.filter((item) => {
    const haystack = normalize([item.label, item.hint ?? '', item.group, item.keywords ?? ''].join(' '));
    return words.every((word) => haystack.includes(word));
  });
}
