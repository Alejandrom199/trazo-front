import type { ArtifactDefinition, ConnectionRules } from '@/core/model';
import { PackageArtifact as P } from './artifactTypes';

/**
 * Catálogo del diagrama de paquetes (UML 2.5, cláusula 12: Paquetes). Única
 * fuente del conocimiento de cada artefacto: la paleta, las explicaciones y la
 * página Aprender leen de aquí.
 */

const MANY: ConnectionRules = { minIn: 0, maxIn: null, minOut: 0, maxOut: null };
const NONE: ConnectionRules = { minIn: 0, maxIn: 0, minOut: 0, maxOut: 0 };

const pkg: ArtifactDefinition = {
  type: P.package,
  diagramType: 'package',
  category: 'agrupación',
  name: 'Paquete',
  umlName: 'Package',
  notation: 'Una carpeta: un rectángulo con una pestaña arriba a la izquierda y el nombre.',
  whatIs: 'Un espacio de nombres que agrupa elementos relacionados: clases, interfaces u otros paquetes.',
  whatFor: 'Divide un sistema grande en partes manejables y muestra qué parte depende de cuál.',
  whyExists: 'Con cientos de clases no se ve la arquitectura: agrupadas en paquetes, sí.',
  whenToUse: ['Para las capas o módulos del sistema: «Interfaz», «Dominio», «Datos».', 'Para anidar submódulos dentro de un módulo.'],
  whenNotToUse: ['Para agrupar por tipo técnico sin sentido de negocio («Utilidades» con todo dentro).'],
  rules: ['Cada elemento pertenece a un solo paquete.', 'Un paquete puede contener otros paquetes: arrástralo dentro.', 'Los nombres son sustantivos: «Pedidos», «Facturación».'],
  commonMistakes: ['Crear dependencias en círculo entre paquetes.', 'Paquetes vacíos o con un solo elemento sin motivo.'],
  example: '«Interfaz» depende de «Dominio», y «Dominio» no depende de nadie.',
  relatedArtifacts: [P.element, P.dependency, P.packageImport],
  connectionRules: MANY,
};

const element: ArtifactDefinition = {
  type: P.element,
  diagramType: 'package',
  category: 'clasificador',
  name: 'Elemento',
  umlName: 'PackageableElement',
  notation: 'Un rectángulo con el nombre de la clase o interfaz; va dentro de su paquete.',
  whatIs: 'Una clase, interfaz u otro elemento del modelo, mostrado solo por su nombre.',
  whatFor: 'Deja ver qué contiene cada paquete sin el detalle de atributos ni operaciones.',
  whyExists: 'El diagrama de paquetes habla de organización: el detalle está en el de clases.',
  whenToUse: ['Para mostrar las clases o interfaces más importantes de cada paquete.'],
  whenNotToUse: ['Para detallar atributos y operaciones: usa un diagrama de clases.'],
  rules: ['Va dentro del paquete al que pertenece.', 'Puede depender de elementos de otros paquetes.'],
  commonMistakes: ['Dejarlo fuera de todo paquete.', 'Listar todas las clases: basta con las representativas.'],
  example: '«Pedido» y «LíneaDePedido» dentro de «Ventas».',
  relatedArtifacts: [P.package, P.dependency],
  connectionRules: MANY,
};

const note: ArtifactDefinition = {
  type: P.note,
  diagramType: 'package',
  category: 'anotación',
  name: 'Nota',
  umlName: 'Comment',
  notation: 'Un rectángulo con la esquina doblada, unido con una línea discontinua a lo que comenta.',
  whatIs: 'Un comentario sobre un paquete o una dependencia.',
  whatFor: 'Explicar una regla de arquitectura o una decisión.',
  whyExists: 'Las razones de una división no siempre se ven en el dibujo.',
  whenToUse: ['Para justificar por qué una capa no puede depender de otra.'],
  whenNotToUse: ['Para repetir lo que ya dice el diagrama.'],
  rules: ['Se ancla al elemento que comenta.'],
  commonMistakes: ['Dejarla suelta.'],
  example: 'Nota en «Dominio»: «no conoce la base de datos».',
  relatedArtifacts: [P.annotationLink],
  connectionRules: NONE,
};

const relation = (definition: Omit<ArtifactDefinition, 'diagramType' | 'category' | 'connectionRules'>): ArtifactDefinition => ({
  ...definition,
  diagramType: 'package',
  category: 'conector',
  connectionRules: NONE,
});

const dependency = relation({
  type: P.dependency,
  name: 'Dependencia',
  umlName: 'Dependency',
  notation: 'Flecha discontinua con punta abierta, del que depende hacia del que depende.',
  whatIs: 'Indica que un paquete (o elemento) usa a otro: si el otro cambia, puede afectarlo.',
  whatFor: 'Muestra el sentido del acoplamiento entre las partes del sistema.',
  whyExists: 'Controlar hacia dónde apuntan las dependencias es la base de una buena arquitectura.',
  whenToUse: ['Siempre que una parte usa a otra.'],
  whenNotToUse: ['Si el uso es una importación de nombres: usa «import» o «access».'],
  rules: ['Va del cliente al proveedor: «Interfaz» → «Dominio».', 'No debe haber ciclos: A → B → A.'],
  commonMistakes: ['Dibujarla al revés.', 'Crear ciclos.'],
  example: '«Pagos» - - → «Pedidos».',
  relatedArtifacts: [P.packageImport, P.packageAccess, P.package],
});

const packageImport = relation({
  type: P.packageImport,
  name: 'Importación',
  umlName: 'PackageImport «import»',
  notation: 'Flecha discontinua con punta abierta, rotulada «import».',
  whatIs: 'Un paquete incorpora los nombres públicos de otro y, además, los vuelve a exponer.',
  whatFor: 'Permite usar los elementos del otro paquete sin nombrarlos con su ruta completa.',
  whyExists: 'Es la forma UML de «using» o «import» de los lenguajes.',
  whenToUse: ['Cuando un paquete usa muchos elementos de otro y los reexpone a quien lo importe a él.'],
  whenNotToUse: ['Si los nombres importados no deben verse desde fuera: usa «access».'],
  rules: ['Va del paquete que importa al importado.', 'Es pública: quien importe al primero también ve los nombres.'],
  commonMistakes: ['Usar «import» cuando el uso es interno.'],
  example: '«Tienda» «import» → «Catálogo».',
  relatedArtifacts: [P.packageAccess, P.dependency],
});

const packageAccess = relation({
  type: P.packageAccess,
  name: 'Acceso',
  umlName: 'PackageImport «access»',
  notation: 'Flecha discontinua con punta abierta, rotulada «access».',
  whatIs: 'Una importación privada: el paquete usa los nombres del otro, pero no los reexpone.',
  whatFor: 'Expresa un uso interno que no forma parte de lo que ofrece el paquete.',
  whyExists: 'Distingue lo que un paquete usa de lo que ofrece.',
  whenToUse: ['Cuando el uso es un detalle interno del paquete.'],
  whenNotToUse: ['Si quien importe al paquete también debe ver esos nombres: usa «import».'],
  rules: ['Va del paquete que accede al accedido.', 'Es privada: no se propaga.'],
  commonMistakes: ['Confundirla con «import».'],
  example: '«Facturación» «access» → «Impuestos».',
  relatedArtifacts: [P.packageImport, P.dependency],
});

const annotationLink = relation({
  type: P.annotationLink,
  name: 'Anclaje de nota',
  umlName: 'Comment annotatedElement',
  notation: 'Línea discontinua sin punta entre una nota y lo que comenta.',
  whatIs: 'La unión entre una nota y el elemento al que se refiere.',
  whatFor: 'Deja claro de qué habla cada comentario.',
  whyExists: 'Una nota suelta no se sabe a qué se refiere.',
  whenToUse: ['Siempre que una nota comenta un elemento concreto.'],
  whenNotToUse: ['Para unir paquetes: eso es una dependencia.'],
  rules: ['Solo une una nota con otro elemento.'],
  commonMistakes: ['Usarla como dependencia.'],
  example: 'Nota anclada a «Dominio».',
  relatedArtifacts: [P.note],
});

export const packageArtifacts: ArtifactDefinition[] = [pkg, element, note, dependency, packageImport, packageAccess, annotationLink];
