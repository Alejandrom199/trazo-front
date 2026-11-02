import { UseCaseArtifact as U } from '../artifactTypes';
import { createUseCaseTemplateBuilder } from './templateBuilder';

const b = createUseCaseTemplateBuilder();
const boundary = b.boundary('Plataforma', { x: 260, y: 40 }, { width: 580, height: 430 });
const user = b.actor('Usuario registrado', { x: 30, y: 110 });
const admin = b.actor('Administrador', { x: 30, y: 300 });
const profile = b.useCase('Consultar perfil', { x: 100, y: 80 }, boundary);
const users = b.useCase('Gestionar usuarios', { x: 100, y: 250 }, boundary);
const audit = b.useCase('Registrar auditoría', { x: 340, y: 250 }, boundary);
const note = b.note('Toda modificación administrativa queda auditada.', { x: 880, y: 300 });
b.relation(user, profile);
b.relation(admin, user, U.generalization);
b.relation(admin, users);
b.relation(users, audit, U.include);
b.relation(note, audit, U.annotationLink);

export const administrationTemplate = b.build({
  id: 'usecase.administration', name: 'Administración de usuarios',
  description: 'El administrador hereda las capacidades del usuario registrado y añade la gestión auditada de usuarios.',
  difficulty: 'intermedio', learningGoals: [U.generalization, U.include, U.note, U.annotationLink],
});
