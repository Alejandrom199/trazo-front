import type { ReactNode } from 'react';

interface PanelProps {
  className?: string;
  children: ReactNode;
}

/** Superficie flotante común a todos los paneles: blanca, redondeada, sombra suave. */
export function Panel({ className = '', children }: PanelProps) {
  return (
    <div className={`rounded-2xl border border-line bg-surface shadow-panel ${className}`}>
      {children}
    </div>
  );
}
