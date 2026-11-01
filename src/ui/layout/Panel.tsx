import type { ReactNode } from 'react';

interface PanelProps {
  className?: string;
  children: ReactNode;
}

/** Superficie flotante común a todos los paneles: borde fino, esquinas discretas, sombra suave. */
export function Panel({ className = '', children }: PanelProps) {
  return (
    <div className={`rounded-xl border border-line bg-surface shadow-panel ${className}`}>
      {children}
    </div>
  );
}
