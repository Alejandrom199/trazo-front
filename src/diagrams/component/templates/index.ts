import type { Template } from '@/core/model';
import { ComponentArtifact as C } from '../artifactTypes';
import { createComponentTemplateBuilder } from './templateBuilder';

/**
 * Básico: tienda en línea. Una cadena de tres piezas en la que cada necesidad
 * (enchufe) la cubre la interfaz que ofrece la siguiente (piruleta).
 */
const onlineStore = (() => {
  const b = createComponentTemplateBuilder();
  const row = 80;
  const web = b.component('Tienda web', { x: 0, y: row });
  const needsOrders = b.required('IPedidos', 240, row);
  const offersOrders = b.provided('IPedidos', 320, row);
  const orders = b.component('Pedidos', { x: 400, y: row });
  const needsPayments = b.required('IPagos', 640, row);
  const offersPayments = b.provided('IPagos', 720, row);
  const payments = b.component('Pagos', { x: 800, y: row });

  b.connect(web, needsOrders);
  b.connect(needsOrders, offersOrders);
  b.connect(orders, offersOrders);
  b.connect(orders, needsPayments);
  b.connect(needsPayments, offersPayments);
  b.connect(payments, offersPayments);

  return b.build({
    id: 'component.online-store',
    name: 'Tienda en línea',
    description: 'Tres piezas en cadena: la tienda necesita IPedidos, que ofrece Pedidos; Pedidos necesita IPagos, que ofrece Pagos.',
    difficulty: 'básico',
    learningGoals: [C.component, C.providedInterface, C.requiredInterface, C.provision, C.requirement, C.assembly],
  });
})();

/**
 * Intermedio: ventas agrupadas en un subsistema, un servicio externo de
 * inventario con su contrato y una dependencia directa a notificaciones.
 */
const salesSubsystem = (() => {
  const b = createComponentTemplateBuilder();
  const sales = b.subsystem('Ventas', { x: 0, y: 0 }, { width: 520, height: 210 });
  const cart = b.component('Carrito', { x: 30, y: 70 }, sales);
  const orders = b.component('Pedidos', { x: 290, y: 70 }, sales);
  const needsStock = b.required('IStock', 580, 70);
  const offersStock = b.provided('IStock', 660, 70);
  const inventory = b.component('Inventario', { x: 740, y: 70 });
  const notifications = b.component('Notificaciones', { x: 290, y: 330 });
  const note = b.note('Carrito y Pedidos se despliegan juntos: comparten el subsistema Ventas.', { x: 30, y: 330 });

  b.connect(cart, orders);
  b.connect(orders, needsStock);
  b.connect(needsStock, offersStock);
  b.connect(inventory, offersStock);
  b.connect(orders, notifications);
  b.connect(note, cart);

  return b.build({
    id: 'component.sales-subsystem',
    name: 'Ventas por subsistemas',
    description: 'Un subsistema agrupa Carrito y Pedidos; Pedidos usa un inventario externo mediante su contrato y avisa a Notificaciones con una dependencia directa.',
    difficulty: 'intermedio',
    learningGoals: [C.subsystem, C.dependency, C.assembly, C.note],
  });
})();

/**
 * Avanzado: microservicios detrás de una pasarela. La pasarela necesita tres
 * contratos; Pedidos encadena el de Pagos, que a su vez usa un banco externo.
 */
const gatewayServices = (() => {
  const b = createComponentTemplateBuilder();
  const [top, middle, bottom] = [0, 200, 400];
  const gateway = b.component('Pasarela API', { x: 0, y: middle });

  const needsAuth = b.required('IAutenticación', 260, top);
  const offersAuth = b.provided('IAutenticación', 400, top);
  const auth = b.component('Autenticación', { x: 520, y: top });

  const needsCatalog = b.required('ICatálogo', 260, middle);
  const offersCatalog = b.provided('ICatálogo', 400, middle);
  const catalog = b.component('Catálogo', { x: 520, y: middle });

  const needsOrders = b.required('IPedidos', 260, bottom);
  const offersOrders = b.provided('IPedidos', 400, bottom);
  const orders = b.component('Pedidos', { x: 520, y: bottom });

  const needsPayments = b.required('IPagos', 780, bottom);
  const offersPayments = b.provided('IPagos', 900, bottom);
  const payments = b.component('Pagos', { x: 1020, y: bottom });
  const bank = b.component('Banco externo', { x: 1020, y: 600 });
  const note = b.note('Único punto de entrada: autentica cada petición y la enruta al servicio que corresponde.', { x: 0, y: 420 });

  for (const [needs, offers, provider] of [
    [needsAuth, offersAuth, auth],
    [needsCatalog, offersCatalog, catalog],
    [needsOrders, offersOrders, orders],
  ] as const) {
    b.connect(gateway, needs);
    b.connect(needs, offers);
    b.connect(provider, offers);
  }
  b.connect(orders, needsPayments);
  b.connect(needsPayments, offersPayments);
  b.connect(payments, offersPayments);
  b.connect(payments, bank);
  b.connect(orders, catalog);
  b.connect(note, gateway);

  return b.build({
    id: 'component.gateway-services',
    name: 'Microservicios con pasarela',
    description: 'Una pasarela API depende de tres contratos; Pedidos encadena Pagos, que usa un banco externo. Sin ciclos: cada servicio se puede desplegar por separado.',
    difficulty: 'avanzado',
    learningGoals: [C.component, C.providedInterface, C.requiredInterface, C.assembly, C.dependency, C.note],
  });
})();

/** Ordenadas de menor a mayor dificultad: así aparecen en la galería. */
export const componentTemplates: Template[] = [onlineStore, salesSubsystem, gatewayServices];
