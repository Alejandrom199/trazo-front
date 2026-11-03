import { UseCaseArtifact as U } from '../artifactTypes';
import { createUseCaseTemplateBuilder } from './templateBuilder';

/** Básico: dos actores comparten parte de las metas de una biblioteca. */
const b = createUseCaseTemplateBuilder();
const boundary = b.boundary('Biblioteca', { x: 220, y: 40 }, { width: 520, height: 420 });
const member = b.actor('Socio', { x: 40, y: 180 });
const librarian = b.actor('Bibliotecario', { x: 800, y: 180 });
const search = b.useCase('Buscar un libro', { x: 175, y: 60 }, boundary);
const borrow = b.useCase('Pedir un préstamo', { x: 175, y: 180 }, boundary);
const giveBack = b.useCase('Devolver un libro', { x: 175, y: 300 }, boundary);

b.relation(member, search);
b.relation(member, borrow);
b.relation(member, giveBack);
b.relation(librarian, borrow);
b.relation(librarian, giveBack);

export const libraryTemplate = b.build({
  id: 'usecase.library',
  name: 'Biblioteca',
  description: 'El socio busca, pide y devuelve libros; el bibliotecario participa en el préstamo y la devolución.',
  difficulty: 'básico',
  learningGoals: [U.actor, U.useCase, U.systemBoundary, U.association],
});
