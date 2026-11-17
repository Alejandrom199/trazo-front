import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Menú desplegable de la barra superior: se abre con su botón y se cierra al
 * elegir, con Escape o con un clic fuera. `children` recibe `close` para que
 * cada opción cierre el menú al actuar.
 */
export function DropdownMenu({
  label,
  trigger,
  triggerClassName,
  width = 'w-72',
  children,
}: {
  /** Nombre accesible del menú. */
  label: string;
  trigger: (open: boolean) => ReactNode;
  triggerClassName: (open: boolean) => string;
  width?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', outside);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('mousedown', outside);
      window.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label={label} className={triggerClassName(open)}>
        {trigger(open)}
      </button>
      {open && (
        <div role="menu" aria-label={label} className={`absolute top-full left-0 z-50 mt-1.5 ${width} rounded-xl border border-line bg-surface p-1.5 shadow-panel`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** Grupo con título dentro de un menú. */
export function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className="py-1 [&+&]:border-t [&+&]:border-line">
      <p className="px-2.5 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">{title}</p>
      {children}
    </div>
  );
}

/** Una opción: icono, nombre, una pista corta y, opcional, una marca a la derecha (cifra o atajo). */
export function MenuItem({ icon, label, hint, aside, disabled = false, onClick }: { icon: IconDefinition; label: string; hint?: string; aside?: ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" disabled={disabled} onClick={onClick} className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-raised disabled:pointer-events-none disabled:opacity-40">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-[12px] text-ink-600"><FontAwesomeIcon icon={icon} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-ink-900">{label}</span>
        {hint && <span className="block text-[11px] leading-snug text-ink-400">{hint}</span>}
      </span>
      {aside && <span className="mt-0.5 shrink-0 text-[11px] text-ink-400">{aside}</span>}
    </button>
  );
}
