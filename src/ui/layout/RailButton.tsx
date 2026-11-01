import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface RailButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconDefinition;
  label: string;
  /** Estado encendido (panel abierto, modo activo): barra de marca a la izquierda. */
  active?: boolean;
}

/** Botón del riel lateral: ícono arriba, texto corto debajo. */
export const RailButton = forwardRef<HTMLButtonElement, RailButtonProps>(function RailButton(
  { icon, label, active = false, className = '', ...buttonProps },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={`group relative flex w-full flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition-colors disabled:opacity-40 ${
        active ? 'text-ink-900' : 'text-ink-400 hover:text-ink-900'
      } ${className}`}
      {...buttonProps}
    >
      {active && <span className="bg-brand absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full" aria-hidden />}
      <span
        className={`flex size-8 items-center justify-center rounded-lg text-[15px] transition-colors ${
          active ? 'bg-accent-soft text-accent' : 'group-hover:bg-raised'
        }`}
      >
        <FontAwesomeIcon icon={icon} />
      </span>
      {/* En móvil el riel muestra solo íconos; aria-label conserva el nombre para lectores de pantalla. */}
      <span className="hidden leading-tight md:block">{label}</span>
    </button>
  );
});
