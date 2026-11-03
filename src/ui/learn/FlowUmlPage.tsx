import { faArrowLeft, faArrowRight, faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { umlKindOf, type DiagramType } from '@/core/model';
import { diagramRegistry } from '@/core/registry';
import { navigate } from '@/ui/navigation/route';

interface FlowPhase {
  name: string;
  question: string;
  purpose: string;
  input: string;
  output: string;
  checkpoint: string;
  diagrams: { type: DiagramType; reason: string }[];
  caseStudy: { deliverable: string; decision: string };
}

const PHASES: FlowPhase[] = [
  { name: 'Requisitos', question: '¿Qué problema vale la pena resolver?', purpose: 'Entender objetivos, restricciones, vocabulario y personas afectadas antes de dibujar soluciones.', input: 'Necesidades del negocio, entrevistas y contexto actual.', output: 'Alcance inicial, actores candidatos y objetivos verificables.', checkpoint: 'El equipo puede explicar el problema sin hablar todavía de tecnología.', diagrams: [], caseStudy: { deliverable: 'Los estudiantes necesitan pedir libros disponibles sin acudir al mostrador.', decision: 'Reducir el tiempo de préstamo sin eliminar la validación bibliotecaria.' } },
  { name: 'Casos de uso', question: '¿Qué debe permitir hacer el sistema?', purpose: 'Convertir las necesidades en metas observables para cada actor y delimitar el sistema.', input: 'Actores, objetivos y alcance acordado.', output: 'Mapa funcional del sistema y relaciones entre capacidades.', checkpoint: 'Cada caso expresa valor para un actor y cabe dentro de la frontera acordada.', diagrams: [{ type: 'usecase', reason: 'Define actores, alcance y capacidades.' }], caseStudy: { deliverable: 'Estudiante → Solicitar préstamo; incluye Validar disponibilidad; Reservar ejemplar es opcional.', decision: 'La disponibilidad es obligatoria; la reserva solo aparece cuando no hay ejemplares.' } },
  { name: 'Actividades', question: '¿Cómo fluye cada objetivo?', purpose: 'Detallar pasos, decisiones, responsabilidades, excepciones y trabajo paralelo.', input: 'Un caso de uso prioritario y sus reglas de negocio.', output: 'Flujo principal, alternativas y responsables.', checkpoint: 'Todos los caminos importantes empiezan, avanzan y terminan sin ambigüedad.', diagrams: [{ type: 'activity', reason: 'Explica el proceso de principio a fin.' }], caseStudy: { deliverable: 'Buscar ejemplar → validar disponibilidad → prestar o proponer reserva → notificar.', decision: 'Se hace explícito el camino alternativo cuando no existe disponibilidad.' } },
  { name: 'Secuencia', question: '¿Quién colabora y en qué orden?', purpose: 'Asignar responsabilidades mostrando mensajes entre interfaz, servicios y otros participantes.', input: 'Un escenario concreto del flujo de actividades.', output: 'Conversación temporal y operaciones necesarias.', checkpoint: 'Cada mensaje tiene un emisor, un receptor y una intención clara.', diagrams: [{ type: 'sequence', reason: 'Ordena las interacciones del escenario.' }], caseStudy: { deliverable: 'Estudiante → Portal → Catálogo → Préstamos → Notificaciones.', decision: 'El portal coordina; el catálogo no crea préstamos y el servicio de préstamos no envía correos.' } },
  { name: 'Clases', question: '¿Qué estructura sostiene el comportamiento?', purpose: 'Descubrir conceptos, responsabilidades, datos y relaciones estables del dominio.', input: 'Vocabulario de requisitos y responsabilidades encontradas en las secuencias.', output: 'Modelo de clases coherente con los comportamientos.', checkpoint: 'Las clases existen por una responsabilidad del dominio, no solo por una tabla o pantalla.', diagrams: [{ type: 'class', reason: 'Modela la estructura estática.' }], caseStudy: { deliverable: 'Libro, Ejemplar, Estudiante, Préstamo y Reserva con responsabilidades diferenciadas.', decision: 'Libro describe la obra; Ejemplar representa cada copia que puede prestarse.' } },
  { name: 'Arquitectura', question: '¿En qué piezas se divide el software?', purpose: 'Agrupar las clases en componentes reemplazables y fijar los contratos (interfaces) por los que se comunican.', input: 'Modelo de clases y colaboraciones encontradas en las secuencias.', output: 'Componentes con responsabilidades claras e interfaces ofrecidas y requeridas.', checkpoint: 'Cada componente puede cambiarse por dentro sin tocar a los demás, porque solo dependen de sus interfaces.', diagrams: [{ type: 'component', reason: 'Divide el sistema en piezas y contratos.' }], caseStudy: { deliverable: 'Portal web, API de Préstamos, Catálogo y Notificaciones; Préstamos requiere «IDisponibilidad», que ofrece Catálogo.', decision: 'Notificaciones queda detrás de una interfaz: cambiar de correo a SMS no toca Préstamos.' } },
  { name: 'Despliegue', question: '¿Dónde corre cada pieza?', purpose: 'Decidir en qué máquinas o servicios se instala cada artefacto y por qué caminos y protocolos se comunican.', input: 'Componentes, restricciones de operación (disponibilidad, costo) y la infraestructura disponible.', output: 'Nodos, entornos de ejecución, artefactos desplegados y caminos de comunicación con su protocolo.', checkpoint: 'Se sabe qué archivo va en qué máquina y cada conexión dice su protocolo.', diagrams: [{ type: 'deployment', reason: 'Muestra la infraestructura y la red.' }], caseStudy: { deliverable: 'El portal en una CDN, la API en un contenedor Docker de un servidor de aplicaciones y la base PostgreSQL en un servicio gestionado.', decision: 'La base no se expone a internet: solo la API se conecta a ella por TCP 5432.' } },
  { name: 'Implementación', question: '¿Cómo se convierte el modelo en software?', purpose: 'Traducir las decisiones útiles a código, APIs, datos e interfaces sin intentar programar el dibujo literalmente.', input: 'Escenarios priorizados, responsabilidades y criterios de aceptación.', output: 'Incremento ejecutable y trazable hasta los requisitos.', checkpoint: 'El código cumple el escenario y conserva las decisiones importantes del modelo.', diagrams: [], caseStudy: { deliverable: 'Endpoint de préstamo, reglas de disponibilidad, persistencia y notificación desacoplada.', decision: 'Se implementa el escenario prioritario; UML orienta el código, pero no se traduce literalmente.' } },
  { name: 'Pruebas', question: '¿El sistema cumple lo acordado?', purpose: 'Verificar escenarios principales, alternativas, reglas y colaboraciones críticas.', input: 'Casos de uso, flujos y criterios de aceptación.', output: 'Evidencia de cumplimiento y nueva información para revisar el modelo.', checkpoint: 'Cada objetivo prioritario tiene pruebas del camino feliz y sus excepciones relevantes.', diagrams: [{ type: 'usecase', reason: 'Da cobertura funcional.' }, { type: 'activity', reason: 'Deriva caminos de prueba.' }, { type: 'sequence', reason: 'Verifica colaboraciones.' }, { type: 'deployment', reason: 'Indica dónde probar la integración y la red.' }], caseStudy: { deliverable: 'Pruebas de préstamo disponible, ejemplar agotado, estudiante bloqueado y fallo de notificación.', decision: 'Los caminos alternativos del modelo se convierten en casos de prueba observables.' } },
];

export function FlowUmlPage() {
  const [current, setCurrent] = useState(0);
  const phase = PHASES[current]!;
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-10">
      <button type="button" onClick={() => navigate({ page: 'learn' })} className="flex items-center gap-2 text-sm text-ink-400 hover:text-ink-900">
        <FontAwesomeIcon icon={faArrowLeft} className="text-xs" /> Volver a Aprender
      </button>
      <header className="mt-6 max-w-3xl">
        <span className="text-xs font-semibold text-accent">Flow UML</span>
        <h1 className="mt-2 text-3xl font-semibold text-ink-900 md:text-4xl">Del problema al software, con el diagrama adecuado</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">UML no impone una cascada. Este recorrido muestra un orden útil para aprender; en un proyecto real se avanza, se valida y se vuelve atrás cuando aparece nueva información.</p>
      </header>

      <div className="mt-6 flex items-start gap-3 border-l-2 border-accent bg-surface px-4 py-3">
        <span className="shrink-0 text-xs font-semibold text-accent">Caso transversal</span>
        <p className="text-sm leading-relaxed text-ink-600"><strong className="font-medium text-ink-900">Biblioteca Digital:</strong> seguimos el préstamo de un libro desde la necesidad inicial hasta sus pruebas.</p>
      </div>

      <ol className="mt-8 flex overflow-x-auto pb-2" aria-label="Fases del recorrido UML">
        {PHASES.map((entry, index) => (
          <li key={entry.name} className="flex min-w-[132px] flex-1 items-center last:flex-none">
            <button type="button" onClick={() => setCurrent(index)} aria-current={index === current ? 'step' : undefined} className="group flex min-w-0 flex-col items-start text-left">
              <span className={`flex size-8 items-center justify-center rounded-full border text-xs font-semibold ${index === current ? 'border-brand bg-brand text-white' : index < current ? 'border-success bg-success-soft text-success' : 'border-line bg-surface text-ink-400'}`}>
                {index < current ? <FontAwesomeIcon icon={faCheck} className="text-[10px]" /> : index + 1}
              </span>
              <span className={`mt-2 text-xs font-medium ${index === current ? 'text-accent' : 'text-ink-600'}`}>{entry.name}</span>
            </button>
            {index < PHASES.length - 1 && <span className="mx-2 mb-5 h-px min-w-8 flex-1 bg-line" aria-hidden />}
          </li>
        ))}
      </ol>

      <section className="mt-5 border-t border-line pt-7">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div>
            <p className="text-xs font-medium text-accent">Fase {current + 1} de {PHASES.length}</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink-900">{phase.name}</h2>
            <p className="mt-2 text-lg leading-relaxed text-ink-900">{phase.question}</p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-600">{phase.purpose}</p>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="border-l-2 border-line pl-4"><dt className="text-xs font-medium text-ink-400">Partes de</dt><dd className="mt-1 text-sm leading-relaxed text-ink-600">{phase.input}</dd></div>
              <div className="border-l-2 border-accent pl-4"><dt className="text-xs font-medium text-ink-400">Debes obtener</dt><dd className="mt-1 text-sm leading-relaxed text-ink-600">{phase.output}</dd></div>
            </dl>
            <div className="mt-6 border-t border-line pt-5">
              <p className="text-xs font-medium text-accent">Biblioteca Digital en esta fase</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-900">{phase.caseStudy.deliverable}</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-600"><span className="font-medium text-ink-900">Decisión:</span> {phase.caseStudy.decision}</p>
            </div>
          </div>
          <aside className="rounded-xl border border-line bg-surface p-5">
            <h3 className="text-sm font-semibold text-ink-900">Listo para avanzar cuando…</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{phase.checkpoint}</p>
            {phase.diagrams.length > 0 && <div className="mt-5 border-t border-line pt-4"><p className="text-xs font-medium text-ink-400">Diagramas que ayudan</p><div className="mt-2 flex flex-col gap-2">{phase.diagrams.map(({ type, reason }) => {
              const available = diagramRegistry.has(type);
              return <button key={type} type="button" disabled={!available} onClick={() => available && navigate({ page: 'learn-diagram', diagramType: type })} className="flex items-center justify-between gap-3 rounded-lg bg-raised px-3 py-2 text-left disabled:opacity-55"><span><span className="block text-sm font-medium text-ink-900">{available ? diagramRegistry.get(type).displayName : `Diagrama de ${umlKindOf(type)?.name.toLowerCase() ?? type}`}</span><span className="block text-xs text-ink-600">{reason}</span></span><span className="text-[11px] text-accent">{available ? 'Abrir guía' : 'Próximamente'}</span></button>;
            })}</div></div>}
          </aside>
        </div>
        <div className="mt-8 flex justify-between border-t border-line pt-5">
          <button type="button" disabled={current === 0} onClick={() => setCurrent(current - 1)} className="rounded-md px-3 py-2 text-sm text-ink-600 hover:bg-raised disabled:opacity-35">Anterior</button>
          <button type="button" disabled={current === PHASES.length - 1} onClick={() => setCurrent(current + 1)} className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-35">Siguiente <FontAwesomeIcon icon={faArrowRight} className="text-xs" /></button>
        </div>
      </section>
    </div>
  );
}
