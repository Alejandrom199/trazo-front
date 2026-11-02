import { UseCaseArtifact as U } from '../artifactTypes';
import { createUseCaseTemplateBuilder } from './templateBuilder';

const b = createUseCaseTemplateBuilder();
const boundary = b.boundary('Plataforma corporativa', { x: 250, y: 30 }, { width: 720, height: 570 });
const employee = b.actor('Empleado', { x: 20, y: 90 });
const administrator = b.actor('Administrador', { x: 20, y: 350 });
const identityProvider = b.actor('Proveedor de identidad', { x: 1030, y: 120 });
const auditService = b.actor('Servicio de auditoría', { x: 1030, y: 410 });

const access = b.useCase('Acceder a la plataforma', { x: 70, y: 80 }, boundary);
const validate = b.useCase('Validar identidad', { x: 390, y: 75 }, boundary);
const secondFactor = b.useCase('Confirmar segundo factor', { x: 390, y: 180 }, boundary);
const manageRoles = b.useCase('Administrar permisos', { x: 70, y: 330 }, boundary);
const authorize = b.useCase('Autorizar cambio de rol', { x: 390, y: 320 }, boundary);
const audit = b.useCase('Registrar evento de seguridad', { x: 390, y: 450 }, boundary);
const note = b.note('El segundo factor se exige cuando el riesgo de acceso es alto.', { x: 1010, y: 255 });

b.relation(employee, access);
b.relation(administrator, employee, U.generalization);
b.relation(administrator, manageRoles);
b.relation(access, validate, U.include);
b.relation(secondFactor, access, U.extend);
b.relation(manageRoles, authorize, U.include);
b.relation(manageRoles, audit, U.include);
b.relation(identityProvider, validate);
b.relation(auditService, audit);
b.relation(note, secondFactor, U.annotationLink);

export const corporateAccessTemplate = b.build({
  id: 'usecase.corporate-access',
  name: 'Acceso corporativo basado en riesgo',
  description: 'Coordina roles especializados y servicios externos; reutiliza validaciones obligatorias y activa un segundo factor solo cuando el riesgo lo exige.',
  difficulty: 'avanzado',
  learningGoals: [U.generalization, U.include, U.extend, U.annotationLink],
});
