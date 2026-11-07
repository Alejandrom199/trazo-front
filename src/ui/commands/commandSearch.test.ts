import { describe, expect, it } from 'vitest';
import { filterCommands, type CommandItem } from './commandSearch';

const items: CommandItem[] = [
  { id: 'export', group: 'Acciones', label: 'Exportar JSON', keywords: 'archivo' },
  { id: 'theme', group: 'Acciones', label: 'Cambiar tema', keywords: 'oscuro claro' },
  { id: 'class', group: 'Aprender', label: 'Diagrama de clases' },
];

describe('búsqueda de comandos', () => {
  it('encuentra sin distinguir acentos ni mayúsculas', () => {
    expect(filterCommands(items, 'json').map((item) => item.id)).toEqual(['export']);
    expect(filterCommands(items, 'CLASES').map((item) => item.id)).toEqual(['class']);
  });

  it('exige que aparezcan todas las palabras', () => {
    expect(filterCommands(items, 'tema oscuro').map((item) => item.id)).toEqual(['theme']);
    expect(filterCommands(items, 'json clases')).toEqual([]);
  });
});
