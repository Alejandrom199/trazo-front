import { ClassArtifact as C } from '../artifactTypes';
import { createClassTemplateBuilder } from './templateBuilder';

/**
 * Facturación con impuestos y descuentos configurables: dos puntos de extensión
 * distintos. Los impuestos son una jerarquía (clase abstracta con subclases);
 * los descuentos, un contrato (interfaz) que cualquier regla puede cumplir.
 * La factura no cambia al agregar un impuesto o un descuento nuevo.
 */
const b = createClassTemplateBuilder();

const product = b.classifier(C.class, 'Producto\n--\n-sku: String\n-precio: Decimal\n--\n+precioVigente(): Decimal', { x: 0, y: 0 });
const line = b.classifier(C.class, 'LineaFactura\n--\n-cantidad: Int\n-precioUnitario: Decimal\n--\n+subtotal(): Decimal', { x: 320, y: 0 });
const invoice = b.classifier(C.class, 'Factura\n--\n-numero: String\n-fecha: Date\n--\n+total(): Decimal\n+emitir()', { x: 640, y: 0 });
const status = b.classifier(C.enumeration, 'EstadoFactura\n--\nBORRADOR\nEMITIDA\nANULADA\n--\n', { x: 960, y: 0 });
const tax = b.classifier(C.abstractClass, 'Impuesto\n--\n#tasa: Decimal\n--\n+calcular(base): Decimal', { x: 320, y: 320 });
const discount = b.classifier(C.interface, 'ReglaDescuento\n--\n\n--\n+aplica(factura): Boolean\n+descuento(factura): Decimal', { x: 960, y: 320 });
const vat = b.classifier(C.class, 'IVA\n--\n\n--\n+calcular(base): Decimal', { x: 160, y: 640 });
const excise = b.classifier(C.class, 'ImpuestoConsumo\n--\n-categoria: String\n--\n+calcular(base): Decimal', { x: 480, y: 640 });
const volume = b.classifier(C.class, 'DescuentoPorVolumen\n--\n-minimo: Int\n--\n+aplica(factura)\n+descuento(factura)', { x: 800, y: 640 });
const coupon = b.classifier(C.class, 'DescuentoCupon\n--\n-codigo: String\n--\n+aplica(factura)\n+descuento(factura)', { x: 1120, y: 640 });
const note = b.note('Abierto a extensión: un impuesto o un descuento nuevo es una clase nueva; Factura no se toca.', { x: 0, y: 340 });

b.relation(line, product, C.association, '0..* de 1');
b.relation(invoice, line, C.composition, '1 contiene 1..*');
b.relation(invoice, status, C.association, 'estado');
b.relation(invoice, tax, C.association, '1..* aplica');
b.relation(invoice, discount, C.aggregation, '0..* descuentos');
b.relation(vat, tax, C.generalization);
b.relation(excise, tax, C.generalization);
b.relation(volume, discount, C.realization);
b.relation(coupon, discount, C.realization);
b.relation(note, tax);

export const invoicingTemplate = b.build({
  id: 'class.invoicing',
  name: 'Facturación con impuestos y descuentos',
  description: 'Dos puntos de extensión: una jerarquía abstracta de impuestos y un contrato de reglas de descuento. Composición, agregación, estados y principio abierto/cerrado.',
  difficulty: 'avanzado',
  learningGoals: [C.abstractClass, C.interface, C.generalization, C.realization, C.composition, C.aggregation, C.enumeration, C.note],
});
