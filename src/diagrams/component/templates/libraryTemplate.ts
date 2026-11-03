import { ComponentArtifact as C } from '../artifactTypes';
import { createComponentTemplateBuilder } from './templateBuilder';

/** Proyecto Biblioteca Digital: piezas y contratos que sostienen el préstamo. */
const b = createComponentTemplateBuilder();
const row = 80;

const portal = b.component('Portal web', { x: 0, y: row });
const portalNeedsLoans = b.required('IPréstamos', 240, row);
const loansOffers = b.provided('IPréstamos', 340, row);
const loans = b.component('Préstamos', { x: 430, y: row });
const loansNeedsCatalog = b.required('IDisponibilidad', 670, row);
const catalogOffers = b.provided('IDisponibilidad', 770, row);
const catalog = b.component('Catálogo', { x: 860, y: row });
const notifications = b.component('Notificaciones', { x: 430, y: 300 });
const note = b.note('Préstamos coordina la operación; Catálogo solo informa disponibilidad.', { x: 760, y: 300 });

b.connect(portal, portalNeedsLoans);
b.connect(portalNeedsLoans, loansOffers);
b.connect(loans, loansOffers);
b.connect(loans, loansNeedsCatalog);
b.connect(loansNeedsCatalog, catalogOffers);
b.connect(catalog, catalogOffers);
b.connect(loans, notifications);
b.connect(note, catalog);

export const libraryComponentTemplate = b.build({
  id: 'component.library',
  name: 'Componentes de Biblioteca Digital',
  description: 'El portal usa el contrato de Préstamos; Préstamos consulta la disponibilidad del Catálogo y delega los avisos a Notificaciones.',
  difficulty: 'intermedio',
  learningGoals: [C.component, C.providedInterface, C.requiredInterface, C.assembly, C.dependency, C.note],
});
