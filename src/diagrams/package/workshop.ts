import type { LearningWorkshop } from '@/core/registry';
import { PackageArtifact as P } from './artifactTypes';
import { createPackageTemplateBuilder } from './templates/templateBuilder';

/*
 * Reto: una aplicación en capas.
 *   - Lógica usa Datos y Datos usa Lógica: un ciclo entre paquetes.
 *   - El paquete Utilidades está vacío.
 *   - Validador está suelto, fuera de todo paquete.
 */
const b = createPackageTemplateBuilder();
const ui = b.pkg('Interfaz', { x: 0, y: 0 }, { width: 300, height: 170 });
const logic = b.pkg('Lógica', { x: 460, y: 0 }, { width: 300, height: 170 });
const data = b.pkg('Datos', { x: 920, y: 0 }, { width: 300, height: 170 });
b.pkg('Utilidades', { x: 460, y: 330 }, { width: 300, height: 170 });
b.element('PantallaPedidos', { x: 60, y: 75 }, ui, 180);
b.element('ServicioPedidos', { x: 60, y: 75 }, logic, 180);
b.element('RepositorioPedidos', { x: 50, y: 75 }, data, 200);
b.element('Validador', { x: 0, y: 380 }, null, 160);
b.connect(ui, logic);
b.connect(logic, data);
b.connect(data, logic, { waypoints: [{ x: 1070, y: 250 }, { x: 610, y: 250 }] });

const brokenLayers = b.build({
  id: 'package.challenge.layers',
  name: 'Reto: capas en círculo',
  description: 'Diagrama intencionalmente defectuoso para practicar dependencias entre paquetes.',
  difficulty: 'intermedio',
  learningGoals: [P.package, P.element, P.dependency],
});

export const packageWorkshop: LearningWorkshop = {
  levels: [
    { name: 'básico', description: 'Agrupa elementos relacionados en paquetes con nombre.' },
    { name: 'intermedio', description: 'Haz que las dependencias vayan en un solo sentido, sin ciclos.' },
    { name: 'avanzado', description: 'Distingue «import» de «access» y rompe ciclos invirtiendo dependencias.' },
  ],
  correctionChallenges: [
    {
      id: 'layers-cycle',
      title: 'Capas que se llaman en círculo',
      context: 'Una aplicación en tres capas. Cambiar cualquier cosa en Datos obliga a revisar Lógica, y al revés.',
      diagram: brokenLayers,
      expectedProblems: 3,
      question: {
        id: 'layers-break',
        prompt: '¿Cómo rompes el ciclo entre Lógica y Datos?',
        options: [
          { id: 'invert', label: 'Quitar Datos → Lógica: si Datos necesita algo, que lo defina en su propio paquete o en uno común', explanation: 'Correcto. Las capas dependen hacia abajo; lo que ambas comparten va en un paquete del que dependen las dos.', correct: true },
          { id: 'merge', label: 'Fusionar Lógica y Datos en un solo paquete', explanation: 'Esconde el ciclo, pero mezcla responsabilidades que convenía separar.', correct: false },
          { id: 'import', label: 'Cambiar la dependencia por un «import»', explanation: 'Un import sigue siendo una dependencia: el ciclo continúa.', correct: false },
        ],
      },
    },
  ],
  briefExercises: [
    {
      id: 'modules-brief',
      title: 'Organiza una tienda',
      brief: 'Una tienda tiene catálogo, carrito, pagos y envíos. El carrito usa productos del catálogo; pagos y envíos trabajan con el pedido que sale del carrito.',
      questions: [
        {
          id: 'modules-split',
          prompt: '¿Cómo agrupas en paquetes?',
          options: [
            { id: 'domain', label: 'Un paquete por área: Catálogo, Carrito, Pagos y Envíos', explanation: 'Correcto: cada paquete agrupa lo que cambia junto.', correct: true },
            { id: 'type', label: 'Por tipo de clase: Entidades, Servicios y Controladores', explanation: 'Funciona, pero un cambio en «pagos» toca los tres paquetes.', correct: false },
            { id: 'one', label: 'Todo en un paquete Tienda', explanation: 'Un solo paquete no organiza nada ni muestra dependencias.', correct: false },
          ],
        },
        {
          id: 'modules-direction',
          prompt: '¿Cómo van las dependencias?',
          options: [
            { id: 'down', label: 'Carrito → Catálogo; Pagos → Carrito; Envíos → Carrito', explanation: 'Correcto: cada paquete depende de lo que usa, y ninguno vuelve atrás.', correct: true },
            { id: 'both', label: 'Catálogo y Carrito dependen el uno del otro', explanation: 'Un ciclo: no se podría cambiar uno sin revisar el otro.', correct: false },
            { id: 'none', label: 'Sin dependencias: cada paquete es independiente', explanation: 'El carrito sí usa el catálogo; ocultarlo no lo elimina.', correct: false },
          ],
        },
      ],
    },
  ],
  comparisons: [
    {
      id: 'import-vs-dependency',
      title: '«import» o dependencia',
      context: 'El paquete Carrito usa constantemente los nombres de Catálogo (Producto, Precio). Dos equipos lo dibujan así:',
      options: [
        { id: 'plain', label: 'Una dependencia «use» sin más', explanation: 'Es correcta, pero no dice que Carrito usa esos nombres sin calificarlos.', correct: false },
        { id: 'import', label: 'Un «import» de Carrito a Catálogo', explanation: 'Correcto. «import» dice que los nombres públicos de Catálogo se usan en Carrito como si fueran propios.', correct: true },
      ],
    },
  ],
};
