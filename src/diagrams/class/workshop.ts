import type { LearningWorkshop } from '@/core/registry';
import { ClassArtifact as C } from './artifactTypes';
import { createClassTemplateBuilder } from './templates/templateBuilder';

/*
 * Reto: un catálogo de publicaciones con cuatro problemas que detecta el editor.
 *   1. Herencia circular: LibroDigital → Libro → Publicación, y Publicación → LibroDigital.
 *      (Hacen falta tres: el editor no admite dos relaciones entre las mismas clases.)
 *   2. Capítulo es parte compuesta de Libro y de Revista a la vez.
 *   3. Una clase sin nombre.
 *   4. Autor no se relaciona con nada.
 * Se resuelve quitando la generalización al revés, dando a Revista su propia parte
 * (o usando agregación), nombrando la clase y relacionando a Autor.
 */
const b = createClassTemplateBuilder();
const publication = b.classifier(C.abstractClass, 'Publicación\n--\n#titulo: String\n--\n+citar(): String', { x: 330, y: 20 });
const book = b.classifier(C.class, 'Libro\n--\n-isbn: String\n--\n', { x: 120, y: 260 });
const magazine = b.classifier(C.class, 'Revista\n--\n-numero: Int\n--\n', { x: 540, y: 260 });
const chapter = b.classifier(C.class, 'Capítulo\n--\n-orden: Int\n--\n', { x: 330, y: 500 });
const ebook = b.classifier(C.class, 'LibroDigital\n--\n-formato: String\n--\n', { x: -120, y: 500 });
const unnamed = b.classifier(C.class, '\n--\n-nombre: String\n--\n', { x: -180, y: 20 });
b.classifier(C.class, 'Autor\n--\n-nombre: String\n--\n', { x: 840, y: 20 });
b.relation(book, publication, C.generalization);
b.relation(magazine, publication, C.generalization);
b.relation(ebook, book, C.generalization);
b.relation(publication, ebook, C.generalization);
b.relation(book, chapter, C.composition, '1 tiene 1..*');
b.relation(magazine, chapter, C.composition, '1 tiene 1..*');
b.relation(book, unnamed, C.association, 'publicado por');

const brokenCatalog = b.build({
  id: 'class.challenge.catalog',
  name: 'Reto: catálogo de publicaciones',
  description: 'Diagrama intencionalmente defectuoso para practicar herencia y composición.',
  difficulty: 'intermedio',
  learningGoals: [C.abstractClass, C.generalization, C.composition],
});

export const classWorkshop: LearningWorkshop = {
  levels: [
    { name: 'básico', description: 'Nombra conceptos del dominio y únelos con asociaciones y multiplicidades.' },
    { name: 'intermedio', description: 'Elige bien entre asociación, agregación y composición, y entre herencia y realización.' },
    { name: 'avanzado', description: 'Decide qué es una clase y qué un atributo, evita jerarquías forzadas y separa contrato de implementación.' },
  ],
  correctionChallenges: [
    {
      id: 'catalog-hierarchy',
      title: 'Un catálogo que se hereda a sí mismo',
      context: 'Alguien modeló libros y revistas de una biblioteca. Hay errores de herencia, de composición y de notación.',
      diagram: brokenCatalog,
      expectedProblems: 4,
      question: {
        id: 'catalog-first-fix',
        prompt: '¿Qué corrección resuelve el error más grave?',
        options: [
          { id: 'remove-cycle', label: 'Quitar la generalización de Publicación hacia LibroDigital', explanation: 'Correcto. LibroDigital es un tipo de Libro, y Libro de Publicación; la flecha al revés cierra un círculo, y UML no admite herencia circular.', correct: true },
          { id: 'abstract', label: 'Hacer abstracta la clase Libro', explanation: 'No rompe el ciclo: Publicación seguiría siendo, a la vez, ancestro y descendiente de LibroDigital.', correct: false },
          { id: 'merge', label: 'Fusionar Libro y Revista en una sola clase', explanation: 'Pierde la diferencia entre ambos conceptos y el ciclo con Publicación sigue ahí.', correct: false },
        ],
      },
    },
  ],
  briefExercises: [
    {
      id: 'order-brief',
      title: 'Modela un pedido',
      brief: 'Un cliente realiza pedidos. Cada pedido tiene una o más líneas; si se borra el pedido, sus líneas desaparecen con él. Cada línea se refiere a un producto del catálogo, que existe aunque no se haya pedido nunca.',
      questions: [
        {
          id: 'order-lines',
          prompt: '¿Cómo se relacionan Pedido y LíneaPedido?',
          options: [
            { id: 'composition', label: 'Composición: Pedido es el todo (rombo negro en Pedido)', explanation: 'Correcto: las líneas no existen sin su pedido y mueren con él.', correct: true },
            { id: 'aggregation', label: 'Agregación (rombo blanco)', explanation: 'La agregación no implica que la parte muera con el todo; aquí sí ocurre.', correct: false },
            { id: 'generalization', label: 'Generalización: una línea es un tipo de pedido', explanation: 'Una línea no «es un» pedido: es parte de él.', correct: false },
          ],
        },
        {
          id: 'order-product',
          prompt: '¿Y LíneaPedido con Producto?',
          options: [
            { id: 'association', label: 'Asociación (cada línea se refiere a 1 producto)', explanation: 'Correcto: el producto existe por su cuenta; la línea solo lo referencia.', correct: true },
            { id: 'composition', label: 'Composición: la línea es dueña del producto', explanation: 'Borrar una línea no puede borrar el producto del catálogo.', correct: false },
            { id: 'attribute', label: 'Un atributo «producto: String» en la línea', explanation: 'Perderías el concepto Producto y sus datos; mejor una relación con la clase.', correct: false },
          ],
        },
      ],
    },
  ],
  comparisons: [
    {
      id: 'inherit-vs-role',
      title: 'Herencia o rol',
      context: 'Una persona de la universidad puede ser estudiante y, más tarde, también docente. Dos equipos lo modelaron así:',
      options: [
        { id: 'inherit', label: 'Estudiante y Docente heredan de Persona', explanation: 'Un objeto no puede cambiar de clase: alguien que pasa de estudiante a docente, o es ambos, no cabe en esa jerarquía.', correct: false },
        { id: 'roles', label: 'Persona se asocia con roles: Matrícula y Contrato docente', explanation: 'Correcto. Los roles cambian con el tiempo y pueden coexistir; la persona sigue siendo la misma.', correct: true },
      ],
    },
  ],
};
