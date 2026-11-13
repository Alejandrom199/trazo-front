import { describe, expect, it } from 'vitest';
import { nodeName } from './nodeName';

describe('nodeName', () => {
  it('Dada una clase con atributos y operaciones, Entonces el nombre es solo su primera línea', () => {
    expect(nodeName({ label: 'Reserva\n--\n-desde: Date\n--\n+confirmar()' })).toBe('Reserva');
  });

  it('Dada una etiqueta de una línea, Entonces es el nombre tal cual, sin espacios sobrantes', () => {
    expect(nodeName({ label: '  Pagar pedido ' })).toBe('Pagar pedido');
  });

  it('Dada una etiqueta vacía o un nodo que no existe, Entonces usa el texto de respaldo', () => {
    expect(nodeName({ label: '\n  \n' })).toBe('sin nombre');
    expect(nodeName(undefined, 'nodo sin nombre')).toBe('nodo sin nombre');
  });
});
