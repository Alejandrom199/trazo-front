import { UseCaseArtifact as U } from '../artifactTypes';
import { createUseCaseTemplateBuilder } from './templateBuilder';

const b = createUseCaseTemplateBuilder();
const boundary = b.boundary('Gestión de siniestros', { x: 260, y: 25 }, { width: 760, height: 610 });
const insured = b.actor('Asegurado', { x: 20, y: 90 });
const analyst = b.actor('Analista', { x: 20, y: 390 });
const fraudSystem = b.actor('Detector de fraude', { x: 1080, y: 110 });
const paymentSystem = b.actor('Sistema de pagos', { x: 1080, y: 450 });

const report = b.useCase('Reportar siniestro', { x: 70, y: 70 }, boundary);
const validatePolicy = b.useCase('Validar cobertura', { x: 420, y: 65 }, boundary);
const addEvidence = b.useCase('Adjuntar evidencia adicional', { x: 70, y: 190 }, boundary);
const investigate = b.useCase('Investigar indicios de fraude', { x: 420, y: 205 }, boundary);
const resolve = b.useCase('Resolver reclamación', { x: 70, y: 370 }, boundary);
const compensate = b.useCase('Ordenar indemnización', { x: 420, y: 385 }, boundary);
const notify = b.useCase('Notificar resolución', { x: 245, y: 505 }, boundary);

b.relation(insured, report);
b.relation(insured, addEvidence);
b.relation(report, validatePolicy, U.include);
b.relation(addEvidence, report, U.extend);
b.relation(analyst, resolve);
b.relation(investigate, resolve, U.extend);
b.relation(fraudSystem, investigate);
b.relation(resolve, notify, U.include);
b.relation(resolve, compensate, U.include);
b.relation(paymentSystem, compensate);

export const insuranceClaimTemplate = b.build({
  id: 'usecase.insurance-claim',
  name: 'Resolución de un siniestro',
  description: 'Separa el flujo obligatorio de las excepciones: evidencia adicional, investigación por fraude, notificación e integración con pagos.',
  difficulty: 'avanzado',
  learningGoals: [U.actor, U.include, U.extend, U.systemBoundary],
});
