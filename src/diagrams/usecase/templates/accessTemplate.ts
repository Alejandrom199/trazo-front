import { UseCaseArtifact as U } from '../artifactTypes';
import { createUseCaseTemplateBuilder } from './templateBuilder';

const b = createUseCaseTemplateBuilder();
const boundary = b.boundary('Portal de clientes', { x: 220, y: 40 }, { width: 520, height: 360 });
const customer = b.actor('Cliente', { x: 40, y: 120 });
const login = b.useCase('Iniciar sesión', { x: 100, y: 80 }, boundary);
const recover = b.useCase('Recuperar contraseña', { x: 100, y: 210 }, boundary);
b.relation(customer, login);
b.relation(customer, recover);

export const accessTemplate = b.build({
  id: 'usecase.access', name: 'Acceso de clientes',
  description: 'Un cliente puede iniciar sesión o recuperar su contraseña dentro del portal.',
  difficulty: 'básico', learningGoals: [U.actor, U.useCase, U.systemBoundary, U.association],
});
