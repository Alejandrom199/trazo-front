import type { Template } from '@/core/model';
import { PackageArtifact as P } from '../artifactTypes';
import { createPackageTemplateBuilder } from './templateBuilder';

/** Básico: tres capas, cada una usa solo a la de abajo. */
const layers = (() => {
  const b = createPackageTemplateBuilder();
  const ui = b.pkg('Interfaz', { x: 0, y: 0 }, { width: 300, height: 170 });
  const logic = b.pkg('Lógica', { x: 460, y: 0 }, { width: 300, height: 170 });
  const data = b.pkg('Datos', { x: 920, y: 0 }, { width: 300, height: 170 });
  b.element('PantallaPedidos', { x: 60, y: 75 }, ui, 180);
  b.element('ServicioPedidos', { x: 60, y: 75 }, logic, 180);
  b.element('RepositorioPedidos', { x: 50, y: 75 }, data, 200);
  b.connect(ui, logic);
  b.connect(logic, data);
  return b.build({
    id: 'package.layers',
    name: 'Aplicación en capas',
    description: 'La interfaz usa la lógica y la lógica usa los datos: las dependencias van en un solo sentido.',
    difficulty: 'básico',
    learningGoals: [P.package, P.element, P.dependency],
  });
})();

/** Básico: una tienda que importa el catálogo y usa los pagos. */
const shop = (() => {
  const b = createPackageTemplateBuilder();
  const store = b.pkg('Tienda', { x: 0, y: 0 }, { width: 280, height: 170 });
  const catalog = b.pkg('Catálogo', { x: 560, y: 0 }, { width: 280, height: 170 });
  const payments = b.pkg('Pagos', { x: 280, y: 330 }, { width: 280, height: 170 });
  b.element('Carrito', { x: 70, y: 75 }, store);
  b.element('Producto', { x: 70, y: 75 }, catalog);
  b.element('Pago', { x: 70, y: 75 }, payments);
  b.connect(store, catalog, { as: P.packageImport });
  b.connect(store, payments, { waypoints: [{ x: 140, y: 415 }] });
  b.connect(payments, catalog, { waypoints: [{ x: 700, y: 415 }] });
  return b.build({
    id: 'package.shop',
    name: 'Tienda en línea',
    description: 'La tienda importa los nombres del catálogo («import») y usa los pagos; los pagos consultan el catálogo. No hay círculos.',
    difficulty: 'básico',
    learningGoals: [P.package, P.packageImport, P.dependency],
  });
})();

/** Intermedio: paquetes anidados y un acceso privado a seguridad. */
const school = (() => {
  const b = createPackageTemplateBuilder();
  const system = b.pkg('Sistema escolar', { x: 0, y: 0 }, { width: 780, height: 330 });
  const academic = b.pkg('Académico', { x: 30, y: 50 }, { width: 400, height: 250 }, system);
  const admin = b.pkg('Administración', { x: 490, y: 50 }, { width: 260, height: 250 }, system);
  const security = b.pkg('Seguridad', { x: 960, y: 80 }, { width: 260, height: 170 });
  b.element('Curso', { x: 40, y: 90 }, academic);
  b.element('Calificación', { x: 220, y: 90 }, academic);
  b.element('Matrícula', { x: 60, y: 90 }, admin);
  b.element('Usuario', { x: 60, y: 75 }, security);
  b.connect(admin, academic);
  b.connect(system, security, { as: P.packageAccess });
  return b.build({
    id: 'package.school',
    name: 'Sistema escolar',
    description: '«Sistema escolar» contiene «Académico» y «Administración»; usa «Seguridad» en privado («access»): quien use el sistema no ve sus nombres.',
    difficulty: 'intermedio',
    learningGoals: [P.package, P.packageAccess, P.dependency],
  });
})();

/** Intermedio: arquitectura limpia, todo apunta hacia el dominio. */
const cleanArchitecture = (() => {
  const b = createPackageTemplateBuilder();
  const ui = b.pkg('Interfaz', { x: 0, y: 0 }, { width: 300, height: 170 });
  const app = b.pkg('Aplicación', { x: 460, y: 0 }, { width: 300, height: 170 });
  const infra = b.pkg('Infraestructura', { x: 0, y: 330 }, { width: 300, height: 170 });
  const domain = b.pkg('Dominio', { x: 460, y: 330 }, { width: 300, height: 170 });
  b.element('Controlador', { x: 80, y: 75 }, ui);
  b.element('CrearPedido', { x: 80, y: 75 }, app);
  b.element('RepositorioSQL', { x: 70, y: 75 }, infra, 160);
  b.element('Pedido', { x: 80, y: 75 }, domain);
  const note = b.note('El dominio no depende de nadie: es lo más estable.', { x: 920, y: 375 }, { width: 200, height: 80 });
  b.connect(ui, app);
  b.connect(app, domain);
  b.connect(infra, domain);
  b.connect(infra, app, { waypoints: [{ x: 150, y: 250 }, { x: 610, y: 250 }] });
  b.connect(note, domain);
  return b.build({
    id: 'package.clean-architecture',
    name: 'Arquitectura limpia',
    description: 'Interfaz e infraestructura dependen de la aplicación, y todo apunta al dominio, que no conoce ni la base de datos ni la pantalla.',
    difficulty: 'intermedio',
    learningGoals: [P.dependency, P.package, P.note],
  });
})();

/** Avanzado: un ciclo entre pedidos y clientes, roto con un paquete de contratos. */
const brokenCycle = (() => {
  const b = createPackageTemplateBuilder();
  const orders = b.pkg('Pedidos', { x: 0, y: 0 }, { width: 280, height: 170 });
  const customers = b.pkg('Clientes', { x: 560, y: 0 }, { width: 280, height: 170 });
  const contracts = b.pkg('Contratos', { x: 280, y: 330 }, { width: 280, height: 170 });
  b.element('Pedido', { x: 70, y: 75 }, orders);
  b.element('Cliente', { x: 70, y: 75 }, customers);
  b.element('IHistorialCompras', { x: 50, y: 75 }, contracts, 180);
  const note = b.note('Antes «Clientes» dependía de «Pedidos» y había un círculo: ahora ambos dependen de la interfaz.', { x: 680, y: 360 }, { width: 240, height: 100 });
  b.connect(orders, customers);
  b.connect(orders, contracts, { label: 'implementa', waypoints: [{ x: 140, y: 415 }] });
  b.connect(customers, contracts, { label: 'usa', waypoints: [{ x: 600, y: 230 }, { x: 420, y: 230 }] });
  b.connect(note, contracts);
  return b.build({
    id: 'package.broken-cycle',
    name: 'Romper un ciclo',
    description: 'Pedidos y Clientes se necesitaban mutuamente. Una interfaz en «Contratos» invierte la dependencia y el círculo desaparece.',
    difficulty: 'avanzado',
    learningGoals: [P.dependency, P.element, P.note],
  });
})();

/** Avanzado: una tienda modular con importaciones públicas y privadas. */
const modularShop = (() => {
  const b = createPackageTemplateBuilder();
  const shopPkg = b.pkg('Tienda', { x: 0, y: 0 }, { width: 900, height: 300 });
  const sales = b.pkg('Ventas', { x: 30, y: 50 }, { width: 380, height: 220 }, shopPkg);
  const inventory = b.pkg('Inventario', { x: 490, y: 50 }, { width: 380, height: 220 }, shopPkg);
  const shared = b.pkg('Compartido', { x: 1060, y: 60 }, { width: 260, height: 180 });
  const gateway = b.pkg('Pasarela de pagos', { x: 1060, y: 400 }, { width: 260, height: 170 });
  b.element('Pedido', { x: 40, y: 90 }, sales);
  b.element('Factura', { x: 210, y: 90 }, sales);
  b.element('Producto', { x: 40, y: 90 }, inventory);
  b.element('Stock', { x: 210, y: 90 }, inventory);
  b.element('Moneda', { x: 60, y: 80 }, shared);
  b.element('Cobro', { x: 60, y: 80 }, gateway);
  b.connect(sales, inventory, { as: P.packageAccess });
  b.connect(shopPkg, shared, { as: P.packageImport });
  b.connect(sales, gateway, { waypoints: [{ x: 220, y: 485 }] });
  return b.build({
    id: 'package.modular-shop',
    name: 'Tienda modular',
    description: 'Ventas usa Inventario en privado («access»); la Tienda importa lo Compartido para todos («import») y Ventas depende de la pasarela externa.',
    difficulty: 'avanzado',
    learningGoals: [P.packageImport, P.packageAccess, P.package],
  });
})();

export const packageTemplates: Template[] = [layers, shop, school, cleanArchitecture, brokenCycle, modularShop];
