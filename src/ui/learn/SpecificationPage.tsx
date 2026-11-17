import { faArrowDown, faArrowRight, faCheck, faFolderOpen, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  LESSON_OF_KIND,
  REQUIREMENT_GUIDES,
  REQUIREMENT_KIND_SUMMARY,
  REQUIREMENT_KINDS,
  REQUIREMENT_QUALITIES,
  requirementDefaults,
  REWRITE_EXAMPLES,
  RULE_TYPES,
  SPEC_EXERCISES,
  SPEC_LESSONS,
  TEST_CASE_GUIDE,
  TRACE_CHAIN,
  type Requirement,
  type RequirementKind,
  type SpecLessonId,
} from '@/core/model';
import { USE_CASE_SHEET_EXAMPLE, USE_CASE_SHEET_FIELDS, USE_CASE_SHEET_TIPS } from '@/diagrams/usecase/specGuide';
import { inputClass } from '@/ui/explanation/formFields';
import { navigate } from '@/ui/navigation/route';
import { openSampleProject } from '@/ui/projects/projectActions';
import { QualityPanel, RequirementSheetTable } from '@/ui/requirements/RequirementSheet';
import { SheetTable } from '@/ui/usecase/UseCaseSheetDialog';
import { QuestionBlock } from './LearningWorkshop';

const KINDS: RequirementKind[] = ['funcional', 'no funcional', 'regla de negocio'];
const anchor = (id: SpecLessonId) => `leccion-${id}`;
const kindOf = (kind: RequirementKind) => REQUIREMENT_KINDS.find((item) => item.id === kind)!;
const prefixOf = (kind: RequirementKind) => kindOf(kind).prefix;

/** El ejemplo de la guía de un tipo, como requisito completo, para mostrar su ficha. */
function exampleRequirement(kind: RequirementKind): Requirement {
  const guide = REQUIREMENT_GUIDES[kind];
  const defaults = requirementDefaults();
  return {
    ...defaults,
    id: `ejemplo-${kind}`,
    code: `${prefixOf(kind)}-1`,
    title: guide.example.title,
    kind,
    description: guide.example.text,
    category: guide.example.category,
    details: guide.example.details,
    priority: 'alta',
    status: 'aprobado',
    rule: kind === 'regla de negocio'
      ? { ...defaults.rule, source: 'Reglamento de préstamos, art. 4', examples: [{ given: 'un socio con 3 préstamos activos', then: 'no puede pedir un cuarto' }] }
      : defaults.rule,
    createdAt: '',
  };
}

/**
 * Aprender › Requisitos y casos de uso: cómo se declara lo que el sistema debe
 * hacer, la ficha de caso de uso, los casos de prueba y cómo se conectan. Las
 * fichas de ejemplo se muestran con las mismas tablas que usa el editor.
 */
export function SpecificationPage({ section }: { section: SpecLessonId | null }) {
  // Tras el reinicio de scroll de la página, se baja a la parte pedida.
  useEffect(() => {
    if (!section) return;
    const frame = window.requestAnimationFrame(() => document.getElementById(anchor(section))?.scrollIntoView({ block: 'start' }));
    return () => window.cancelAnimationFrame(frame);
  }, [section]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <button type="button" onClick={() => navigate({ page: 'learn' })} className="text-xs font-semibold uppercase tracking-wider text-accent hover:underline">Aprender</button>
      <header className="mt-2 max-w-3xl">
        <h1 className="text-3xl font-semibold text-ink-900 md:text-4xl">Requisitos y casos de uso</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          Antes de dibujar: qué debe hacer el sistema, cómo se escribe para que se pueda verificar, cómo se cuenta un caso de
          uso paso a paso y cómo se prueba. Las fichas de ejemplo son las mismas que llenas en el editor.
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Partes de la lección" className="lg:sticky lg:top-6 lg:self-start">
          <ol className="flex flex-wrap gap-1 lg:flex-col">
            {SPEC_LESSONS.map((lesson, index) => (
              <li key={lesson.id}>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'learn-spec', section: lesson.id })}
                  aria-current={section === lesson.id ? 'true' : undefined}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm ${section === lesson.id ? 'bg-accent-soft font-medium text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'}`}
                >
                  <span className="w-4 text-right text-[11px] tabular-nums text-ink-400">{index + 1}</span>
                  {lesson.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 space-y-16">
          <Lesson id="requisitos" title="Qué es un buen requisito">
            <p>Un requisito dice algo que el sistema debe cumplir. Se escribe para que cualquiera lo entienda igual y para poder comprobar si se cumplió.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {REQUIREMENT_QUALITIES.map((quality) => (
                <div key={quality.name} className="rounded-xl border border-line p-4">
                  <p className="font-semibold text-ink-900">{quality.name}</p>
                  <p className="mt-1 text-sm text-ink-600">{quality.text}</p>
                </div>
              ))}
            </div>
            <h3 className="mt-8 text-base font-semibold text-ink-900">Tres tipos</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {KINDS.map((kind) => (
                <button key={kind} type="button" onClick={() => navigate({ page: 'learn-spec', section: LESSON_OF_KIND[kind] })} className="rounded-xl border border-line p-4 text-left hover:border-accent/40">
                  <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent">{prefixOf(kind)}</span>
                  <p className="mt-2 font-semibold text-ink-900">{kindOf(kind).name}</p>
                  <p className="mt-0.5 text-sm font-medium text-ink-900">{REQUIREMENT_KIND_SUMMARY[kind].question}</p>
                  <p className="mt-1 text-sm text-ink-600">{REQUIREMENT_KIND_SUMMARY[kind].text}</p>
                </button>
              ))}
            </div>
          </Lesson>

          {KINDS.map((kind) => <KindLesson key={kind} kind={kind} />)}

          <Lesson id="revisor" title="Prueba el revisor">
            <p>Escribe un requisito y mira qué diría el revisor. Es el mismo que te acompaña en el editor de requisitos.</p>
            <ReviewerPlayground />
          </Lesson>

          <Lesson id="caso-de-uso" title="Ficha de caso de uso">
            <p>El óvalo del diagrama dice <em>qué</em> se puede hacer; la ficha cuenta <em>cómo ocurre</em>, paso a paso, y qué requisito cumple. Cada campo:</p>
            <dl className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line">
              {USE_CASE_SHEET_FIELDS.map((item) => (
                <div key={item.field} className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
                  <dt className="text-sm font-semibold text-ink-900">{item.field}</dt>
                  <dd className="text-sm text-ink-600">{item.text}</dd>
                </div>
              ))}
            </dl>
            <Tips items={USE_CASE_SHEET_TIPS} />
            <h3 className="mt-8 text-base font-semibold text-ink-900">Así queda una ficha completa</h3>
            <div className="mt-3">
              <SheetTable name={USE_CASE_SHEET_EXAMPLE.name} spec={USE_CASE_SHEET_EXAMPLE.spec} context={USE_CASE_SHEET_EXAMPLE.context} references={USE_CASE_SHEET_EXAMPLE.references} />
            </div>
            <p className="mt-4 text-sm">
              En el editor, selecciona un caso de uso y abre su ficha desde Propiedades. Ahí también está el <strong className="font-medium text-ink-900">listado de casos de uso</strong> (Código, Nombre, Actor), listo para copiar.
            </p>
          </Lesson>

          <Lesson id="casos-de-prueba" title="Casos de prueba">
            <p>{TEST_CASE_GUIDE.intro}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {TEST_CASE_GUIDE.parts.map((part) => (
                <div key={part.name} className="rounded-xl border border-line p-4">
                  <p className="font-semibold text-accent">{part.name}</p>
                  <p className="mt-1 text-sm text-ink-600">{part.text}</p>
                </div>
              ))}
            </div>
            <h3 className="mt-8 text-base font-semibold text-ink-900">Ejemplo</h3>
            <table className="mt-3 w-full border-collapse text-sm">
              <tbody>
                {([['Caso', `${TEST_CASE_GUIDE.example.code} ${TEST_CASE_GUIDE.example.title}`], ['Dado', TEST_CASE_GUIDE.example.given], ['Cuando', TEST_CASE_GUIDE.example.when], ['Entonces', TEST_CASE_GUIDE.example.then], ['Verifica', TEST_CASE_GUIDE.example.verifies]] as const).map(([label, value]) => (
                  <tr key={label}>
                    <th scope="row" className="w-32 border border-line bg-raised px-3 py-2 text-left align-top font-semibold text-ink-900">{label}</th>
                    <td className="border border-line px-3 py-2 text-ink-900">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-5 text-sm">{TEST_CASE_GUIDE.coverage}</p>
            <Tips items={TEST_CASE_GUIDE.tips} />
          </Lesson>

          <Lesson id="trazabilidad" title="Cómo se conecta todo">
            <p>Cada pieza apunta a la anterior. Así se puede responder «¿qué diseño cumple este requisito?» y «¿está probado?».</p>
            <ol className="mt-5 space-y-2">
              {TRACE_CHAIN.map((link, index) => (
                <li key={link.name}>
                  <div className="flex items-start gap-4 rounded-xl border border-line p-4">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900">{link.name} <span className="font-normal text-ink-400">· {link.example}</span></p>
                      <p className="mt-0.5 text-sm text-ink-600">{link.text}</p>
                    </div>
                  </div>
                  {index < TRACE_CHAIN.length - 1 && <FontAwesomeIcon icon={faArrowDown} className="my-1 ml-7 text-xs text-ink-400" />}
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => { void openSampleProject(); navigate({ page: 'editor' }); }}
              className="mt-5 flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <FontAwesomeIcon icon={faFolderOpen} className="text-xs" /> Verlo en el proyecto de ejemplo
            </button>
          </Lesson>

          <Lesson id="ejercicios" title="Ejercicios">
            <p>¿Qué está mal? Elige y lee por qué.</p>
            {SPEC_EXERCISES.map((exercise) => <QuestionBlock key={exercise.id} question={exercise} />)}
          </Lesson>
        </div>
      </div>
    </div>
  );
}

function Lesson({ id, title, children }: { id: SpecLessonId; title: string; children: ReactNode }) {
  return (
    <section id={anchor(id)} aria-labelledby={`${anchor(id)}-title`} className="scroll-mt-6 text-[15px] leading-relaxed text-ink-600">
      <h2 id={`${anchor(id)}-title`} className="text-2xl font-semibold text-ink-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Tips({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-5 space-y-2">
      {items.map((tip) => (
        <li key={tip} className="flex gap-2.5 text-sm text-ink-600"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{tip}</li>
      ))}
    </ul>
  );
}

/** La lección de un tipo de requisito: patrón, consejos, mal → bien y su ficha. */
function KindLesson({ kind }: { kind: RequirementKind }) {
  const guide = REQUIREMENT_GUIDES[kind];
  const rewrite = REWRITE_EXAMPLES[kind];
  const id: SpecLessonId = LESSON_OF_KIND[kind];
  const example = useMemo(() => exampleRequirement(kind), [kind]);
  return (
    <Lesson id={id} title={SPEC_LESSONS.find((lesson) => lesson.id === id)!.title}>
      <p>{REQUIREMENT_KIND_SUMMARY[kind].text} Responde: <strong className="font-medium text-ink-900">{REQUIREMENT_KIND_SUMMARY[kind].question}</strong></p>
      <p className="mt-4 rounded-xl bg-accent-soft/60 px-4 py-3 font-medium text-ink-900">{guide.pattern}</p>
      <Tips items={guide.tips} />

      <h3 className="mt-8 text-base font-semibold text-ink-900">Mal escrito → bien escrito</h3>
      <div className="mt-3 grid items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="rounded-xl border border-danger/30 bg-danger-soft/40 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-danger"><FontAwesomeIcon icon={faXmark} /> Así no</p>
          <p className="mt-2 text-sm font-medium text-ink-900">«{rewrite.bad}»</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm text-ink-600">{rewrite.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
        </div>
        <FontAwesomeIcon icon={faArrowRight} className="self-center justify-self-center text-ink-400 max-md:rotate-90" />
        <div className="rounded-xl border border-success/30 bg-success-soft/40 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-success"><FontAwesomeIcon icon={faCheck} /> Así sí</p>
          <p className="mt-2 text-sm font-medium text-ink-900">«{rewrite.good}»</p>
        </div>
      </div>

      {kind === 'regla de negocio' && (
        <>
          <h3 className="mt-8 text-base font-semibold text-ink-900">Tipos de regla</h3>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {RULE_TYPES.map((type) => (
              <div key={type.id} className="rounded-xl border border-line p-3">
                <dt className="text-sm font-semibold text-ink-900">{type.name} <span className="font-normal text-ink-400">· {type.hint.toLowerCase()}</span></dt>
                <dd className="mt-1 text-sm text-ink-600">{type.example}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      <h3 className="mt-8 text-base font-semibold text-ink-900">Así queda la ficha</h3>
      <div className="mt-3">
        <RequirementSheetTable requirement={example} fulfilledBy={[]} />
      </div>
    </Lesson>
  );
}

/** Escribe un requisito y ve la revisión en vivo (el mismo revisor del editor). */
function ReviewerPlayground() {
  const [kind, setKind] = useState<RequirementKind>('funcional');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('El sistema debe ser rápido y fácil de usar.');
  const [details, setDetails] = useState('');
  const requirement: Requirement = {
    ...requirementDefaults(),
    id: 'prueba',
    code: `${prefixOf(kind)}-1`,
    title,
    kind,
    description: text,
    details: details.split('\n').map((line) => line.trim()).filter(Boolean),
    createdAt: '',
  };
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-3 rounded-xl border border-line p-4">
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Tipo de requisito">
          {KINDS.map((option) => (
            <button key={option} type="button" role="radio" aria-checked={kind === option} onClick={() => setKind(option)} className={`rounded-md px-3 py-1.5 text-sm ${kind === option ? 'bg-accent-soft font-medium text-accent' : 'text-ink-600 hover:bg-raised'}`}>
              {kindOf(option).name}
            </button>
          ))}
        </div>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Título</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={REQUIREMENT_GUIDES[kind].example.title} className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Requisito</span>
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={3} placeholder={REQUIREMENT_GUIDES[kind].textPlaceholder} className={`${inputClass} mt-1 resize-y`} />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">{REQUIREMENT_GUIDES[kind].detailsLabel} (uno por línea)</span>
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={3} placeholder={REQUIREMENT_GUIDES[kind].detailsPlaceholder} className={`${inputClass} mt-1 resize-y`} />
        </label>
      </div>
      <QualityPanel requirement={requirement} />
    </div>
  );
}
