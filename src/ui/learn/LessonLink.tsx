import { faArrowRight, faGraduationCap } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { SpecLessonId } from '@/core/model';
import { navigate } from '@/ui/navigation/route';

/**
 * Enlace del editor a la parte de la lección que explica lo que se está
 * llenando. La teoría vive en Aprender; aquí solo un recordatorio de una línea.
 * `onLeave` cierra lo que tape la página (p. ej. un diálogo a pantalla completa).
 */
export function LessonLink({ lesson, label, reminder, onLeave }: { lesson: SpecLessonId; label: string; reminder?: string; onLeave?: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        onLeave?.();
        navigate({ page: 'learn-spec', section: lesson });
      }}
      className="group flex w-full items-start gap-3 rounded-xl border border-line px-4 py-3 text-left hover:border-accent/40 hover:bg-accent-soft/30"
    >
      <FontAwesomeIcon icon={faGraduationCap} className="mt-0.5 text-sm text-accent" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-900">
          {label}
          <FontAwesomeIcon icon={faArrowRight} className="text-[9px] text-accent transition-transform group-hover:translate-x-0.5" />
        </span>
        {reminder && <span className="mt-1 block text-xs leading-relaxed text-ink-600">{reminder}</span>}
      </span>
    </button>
  );
}
