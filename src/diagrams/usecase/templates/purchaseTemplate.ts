import { UseCaseArtifact as U } from '../artifactTypes';
import { createUseCaseTemplateBuilder } from './templateBuilder';

const b = createUseCaseTemplateBuilder();
const boundary = b.boundary('Tienda en línea', { x: 220, y: 40 }, { width: 620, height: 450 });
const customer = b.actor('Cliente', { x: 35, y: 130 });
const gateway = b.actor('Pasarela de pago', { x: 900, y: 230 });
const purchase = b.useCase('Comprar productos', { x: 80, y: 90 }, boundary);
const calculate = b.useCase('Calcular total', { x: 350, y: 80 }, boundary);
const payment = b.useCase('Procesar pago', { x: 350, y: 220 }, boundary);
const coupon = b.useCase('Aplicar cupón', { x: 80, y: 300 }, boundary);
b.relation(customer, purchase);
b.relation(gateway, payment);
b.relation(purchase, calculate, U.include);
b.relation(purchase, payment, U.include);
b.relation(coupon, purchase, U.extend);

export const purchaseTemplate = b.build({
  id: 'usecase.purchase', name: 'Compra en línea',
  description: 'La compra siempre calcula el total y procesa el pago; aplicar un cupón es una extensión opcional.',
  difficulty: 'intermedio', learningGoals: [U.actor, U.useCase, U.association, U.include, U.extend],
});
