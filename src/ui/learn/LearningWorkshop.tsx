import { faArrowUpRightFromSquare, faCheck, faScrewdriverWrench } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useMemo, useState } from 'react';
import type { Template } from '@/core/model';
import type { LearningOption, LearningQuestion, LearningWorkshop as WorkshopData } from '@/core/registry';
import type { DiagramModule } from '@/core/registry';
import { TemplatePreview } from '@/ui/templates/TemplatePreview';

type Mode = 'correct' | 'model' | 'compare';

interface LearningWorkshopProps {
  module: DiagramModule;
  workshop: WorkshopData;
  onOpen: (template: Template) => void;
}

export function LearningWorkshop({ module, workshop, onOpen }: LearningWorkshopProps) {
  const storageKey = `trazo.learning.${module.diagramType}`;
  const [mode, setMode] = useState<Mode>('correct');
  const [completed, setCompleted] = useState<string[]>(() => readProgress(storageKey));

  useEffect(() => localStorage.setItem(storageKey, JSON.stringify(completed)), [completed, storageKey]);
  const total = workshop.correctionChallenges.length
    + workshop.briefExercises.reduce((sum, exercise) => sum + exercise.questions.length, 0)
    + workshop.comparisons.length;
  const done = completed.filter((id) => id.startsWith('workshop:')).length;
  const complete = (id: string) => setCompleted((current) => current.includes(id) ? current : [...current, id]);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="grid border-b border-line md:grid-cols-[1fr_auto]">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><FontAwesomeIcon icon={faScrewdriverWrench} /></span>
            <div><h3 className="text-[15px] font-semibold text-ink-900">Taller de modelado</h3><p className="text-xs text-ink-600">Decide, comprueba y abre el diagrama para corregirlo.</p></div>
          </div>
        </div>
        <div className="flex min-w-48 items-center border-t border-line px-5 py-4 md:border-l md:border-t-0">
          <div className="w-full"><div className="flex justify-between text-xs"><span className="text-ink-400">Progreso</span><span className="font-medium text-ink-900">{done} de {total}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-raised"><div className="h-full bg-brand transition-[width]" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div></div>
        </div>
      </div>

      <div className="grid border-b border-line md:grid-cols-3">
        {workshop.levels.map((level) => <div key={level.name} className="border-b border-line p-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"><p className="text-xs font-semibold capitalize text-ink-900">{level.name}</p><p className="mt-1 text-xs leading-relaxed text-ink-600">{level.description}</p></div>)}
      </div>

      <div className="flex gap-1 border-b border-line p-2" role="tablist" aria-label="Tipos de práctica">
        <ModeButton active={mode === 'correct'} onClick={() => setMode('correct')}>Corregir</ModeButton>
        <ModeButton active={mode === 'model'} onClick={() => setMode('model')}>Desde un enunciado</ModeButton>
        <ModeButton active={mode === 'compare'} onClick={() => setMode('compare')}>Comparar soluciones</ModeButton>
      </div>

      <div className="p-5">
        {mode === 'correct' && workshop.correctionChallenges.map((challenge) => (
          <div key={challenge.id} className="grid gap-5 lg:grid-cols-[minmax(260px,.85fr)_minmax(0,1.15fr)]">
            <div className="overflow-hidden rounded-lg border border-line bg-canvas"><div className="flex h-52 items-center justify-center"><TemplatePreview diagram={challenge.diagram.diagram} module={module} width={410} height={200} /></div><div className="border-t border-line px-4 py-3"><p className="text-xs text-ink-600">El validador debe detectar <strong className="text-ink-900">{challenge.expectedProblems} problemas</strong>.</p></div></div>
            <div><h4 className="text-lg font-semibold text-ink-900">{challenge.title}</h4><p className="mt-1 text-sm leading-relaxed text-ink-600">{challenge.context}</p><QuestionBlock question={challenge.question} onCorrect={() => complete(`workshop:${challenge.id}`)} /><button type="button" onClick={() => onOpen(challenge.diagram)} className="mt-4 flex items-center gap-2 rounded-md border border-line px-3.5 py-2 text-sm text-ink-900 hover:bg-raised"><FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" /> Abrir reto en el editor</button></div>
          </div>
        ))}
        {mode === 'model' && workshop.briefExercises.map((exercise) => <div key={exercise.id}><h4 className="text-lg font-semibold text-ink-900">{exercise.title}</h4><blockquote className="mt-3 border-l-2 border-accent pl-4 text-sm leading-relaxed text-ink-600">{exercise.brief}</blockquote><div className="mt-5 grid gap-4 md:grid-cols-2">{exercise.questions.map((question) => <QuestionBlock key={question.id} question={question} onCorrect={() => complete(`workshop:${exercise.id}:${question.id}`)} />)}</div></div>)}
        {mode === 'compare' && workshop.comparisons.map((comparison) => <div key={comparison.id}><h4 className="text-lg font-semibold text-ink-900">{comparison.title}</h4><p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">{comparison.context}</p><QuestionBlock question={{ id: comparison.id, prompt: '¿Qué modelo conserva mejor la intención?', options: comparison.options }} onCorrect={() => complete(`workshop:${comparison.id}`)} /></div>)}
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`rounded-md px-3 py-2 text-sm ${active ? 'bg-accent-soft font-medium text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'}`}>{children}</button>;
}

function QuestionBlock({ question, onCorrect }: { question: LearningQuestion; onCorrect: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const pickedOption = useMemo(() => question.options.find((option) => option.id === picked), [picked, question.options]);
  function choose(option: LearningOption) { setPicked(option.id); if (option.correct) onCorrect(); }
  return <div className="mt-5 rounded-lg bg-canvas p-4"><p className="text-sm font-medium leading-relaxed text-ink-900">{question.prompt}</p><div className="mt-3 grid gap-2">{question.options.map((option) => { const selected = picked === option.id; return <button key={option.id} type="button" onClick={() => choose(option)} className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-left text-sm ${selected ? option.correct ? 'border-success bg-success-soft text-success' : 'border-danger bg-danger-soft text-danger' : 'border-line bg-surface text-ink-600 hover:border-accent/40 hover:text-ink-900'}`}>{selected && option.correct && <FontAwesomeIcon icon={faCheck} className="mt-1 text-xs" />}<span>{option.label}</span></button>; })}</div>{pickedOption && <p className={`mt-3 text-xs leading-relaxed ${pickedOption.correct ? 'text-success' : 'text-danger'}`}>{pickedOption.explanation}</p>}</div>;
}

function readProgress(key: string): string[] {
  try { const value = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; } catch { return []; }
}
