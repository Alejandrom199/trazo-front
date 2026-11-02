import type { ArtifactDefinition, ConnectionRules } from '@/core/model';
import { ClassArtifact as C } from './artifactTypes';

const MANY: ConnectionRules = { minIn: 0, maxIn: null, minOut: 0, maxOut: null };
const NONE: ConnectionRules = { minIn: 0, maxIn: 0, minOut: 0, maxOut: 0 };
const item = (type: string, category: ArtifactDefinition['category'], name: string, umlName: string, whatIs: string, notation: string, example: string, relatedArtifacts: string[], rules: string[] = []): ArtifactDefinition => ({
  type, diagramType: 'class', category, name, umlName, whatIs, notation, example, relatedArtifacts, rules,
  whatFor: `Permite expresar ${whatIs.charAt(0).toLowerCase()}${whatIs.slice(1)}`,
  whyExists: 'Hace explícita una decisión estructural para que el modelo pueda discutirse antes de implementarlo.',
  whenToUse: ['Cuando esta distinción aporta información al dominio o al diseño.'],
  whenNotToUse: ['Cuando solo añade detalle de implementación sin ayudar a comprender el modelo.'],
  commonMistakes: ['Usarlo por costumbre sin justificar la relación o responsabilidad.'],
  connectionRules: category === 'conector' || type === C.package ? NONE : MANY,
});

export const classArtifacts: ArtifactDefinition[] = [
  item(C.class, 'clasificador', 'Clase', 'Class', 'Un concepto con atributos, operaciones y responsabilidades.', 'Rectángulo dividido en nombre, atributos y operaciones.', 'Pedido con total y calcularTotal().', [C.association, C.generalization]),
  item(C.abstractClass, 'clasificador', 'Clase abstracta', 'Class {abstract}', 'Una clase incompleta que define estructura común para sus especializaciones.', 'Como una clase, con el nombre en cursiva.', 'Pago como base de PagoTarjeta.', [C.generalization]),
  item(C.interface, 'clasificador', 'Interfaz', 'Interface', 'Un contrato de operaciones que varias clases pueden realizar.', 'Clasificador con el estereotipo «interface».', 'Notificable con enviar().', [C.realization]),
  item(C.enumeration, 'clasificador', 'Enumeración', 'Enumeration', 'Un tipo cerrado formado por un conjunto conocido de valores.', 'Clasificador con «enumeration» y sus literales.', 'EstadoPedido: PENDIENTE, PAGADO.', [C.class]),
  item(C.package, 'agrupación', 'Paquete', 'Package', 'Una agrupación de clasificadores relacionados.', 'Carpeta UML con nombre y contenido.', 'Paquete Ventas.', [C.class]),
  item(C.note, 'anotación', 'Nota', 'Comment', 'Una aclaración que no cambia la estructura del modelo.', 'Rectángulo con esquina doblada.', 'El pedido conserva precios históricos.', [C.annotationLink]),
  item(C.association, 'conector', 'Asociación', 'Association', 'Una relación estable entre instancias, con nombre y multiplicidades.', 'Línea continua.', 'Cliente 1 realiza 0..* Pedidos.', [C.class]),
  item(C.aggregation, 'conector', 'Agregación', 'Shared Aggregation', 'Una relación todo-parte donde la parte puede existir independientemente.', 'Línea con rombo blanco en el todo.', 'Equipo agrega Jugadores.', [C.composition]),
  item(C.composition, 'conector', 'Composición', 'Composite Aggregation', 'Una relación todo-parte con propiedad fuerte y ciclo de vida compartido.', 'Línea con rombo negro en el todo.', 'Pedido compone Líneas de pedido.', [C.aggregation]),
  item(C.generalization, 'conector', 'Generalización', 'Generalization', 'Herencia: la especialización cumple el contrato de la clase general.', 'Línea continua con triángulo abierto hacia la general.', 'PagoTarjeta hereda de Pago.', [C.abstractClass]),
  item(C.realization, 'conector', 'Realización', 'Realization', 'Una clase implementa el contrato declarado por una interfaz.', 'Línea discontinua con triángulo abierto hacia la interfaz.', 'EmailNotificador realiza Notificable.', [C.interface]),
  item(C.dependency, 'conector', 'Dependencia', 'Dependency', 'Un clasificador usa temporalmente a otro sin conservarlo como parte de su estado.', 'Línea discontinua con flecha abierta.', 'Reporte depende de ExportadorPDF.', [C.class]),
  item(C.annotationLink, 'conector', 'Anclaje de nota', 'Comment annotatedElement', 'La unión entre una nota y el elemento que explica.', 'Línea discontinua sin punta.', 'Nota anclada a Pedido.', [C.note]),
];
