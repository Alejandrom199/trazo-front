import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useRef, useState } from 'react';
import type { ImageBackground, ImageExportOptions, ImageFormat, ImageFrame } from '@/canvas/exportImage';
import { useDialogBehavior } from '@/ui/dialogs/useDialogBehavior';

type Choices = Omit<ImageExportOptions, 'title'>;

const STORAGE_KEY = 'trazo.exportOptions';
const DEFAULTS: Choices = { format: 'png', background: 'light', frame: 'none', borderColor: null, borderWidth: 1.5, borderRadius: 14, padding: 32 };

/** Medidas del marco que el usuario puede ajustar, con sus límites. */
const MEASURES: { key: 'borderWidth' | 'borderRadius' | 'padding'; label: string; min: number; max: number; step: number }[] = [
  { key: 'borderWidth', label: 'Grosor del borde', min: 0, max: 12, step: 0.5 },
  { key: 'borderRadius', label: 'Redondeo de las esquinas', min: 0, max: 48, step: 1 },
  { key: 'padding', label: 'Espacio alrededor del diagrama', min: 0, max: 120, step: 4 },
];

/** Colores sugeridos para el borde; además se puede elegir cualquiera. */
const BORDER_COLORS: { value: string; label: string }[] = [
  { value: '#27272a', label: 'Negro' },
  { value: '#7c3aed', label: 'Morado' },
  { value: '#2563eb', label: 'Azul' },
  { value: '#059669', label: 'Verde' },
  { value: '#dc2626', label: 'Rojo' },
];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const FORMATS: { value: ImageFormat; label: string; hint: string }[] = [
  { value: 'png', label: 'PNG', hint: 'Para documentos y presentaciones' },
  { value: 'svg', label: 'SVG', hint: 'Escalable, sin perder nitidez' },
];
const BACKGROUNDS: { value: ImageBackground; label: string; hint: string }[] = [
  { value: 'light', label: 'Claro', hint: 'Fondo claro' },
  { value: 'dark', label: 'Oscuro', hint: 'Fondo oscuro' },
  { value: 'transparent', label: 'Transparente', hint: 'Sin fondo; trazos oscuros, para fondos claros' },
];
const FRAMES: { value: ImageFrame; label: string; hint: string }[] = [
  { value: 'none', label: 'Sin marco', hint: 'Solo el diagrama' },
  { value: 'border', label: 'Borde', hint: 'Un borde redondeado alrededor' },
  { value: 'titled', label: 'Borde y título', hint: 'Con el nombre del diagrama arriba' },
];

/** Última elección (preferencia de este navegador); si no hay o no se puede leer, la de por defecto. */
function readChoices(): Choices {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && typeof saved === 'object') {
      const { format, background, frame, borderColor, ...measures } = saved as Partial<Choices>;
      const measure = (key: (typeof MEASURES)[number]['key']) => {
        const value = measures[key];
        const limits = MEASURES.find((entry) => entry.key === key)!;
        return typeof value === 'number' && value >= limits.min && value <= limits.max ? value : DEFAULTS[key];
      };
      return {
        borderWidth: measure('borderWidth'),
        borderRadius: measure('borderRadius'),
        padding: measure('padding'),
        format: FORMATS.some((option) => option.value === format) ? format! : DEFAULTS.format,
        background: BACKGROUNDS.some((option) => option.value === background) ? background! : DEFAULTS.background,
        frame: FRAMES.some((option) => option.value === frame) ? frame! : DEFAULTS.frame,
        borderColor: typeof borderColor === 'string' && HEX_COLOR.test(borderColor) ? borderColor : DEFAULTS.borderColor,
      };
    }
  } catch {
    // Sin almacenamiento o dato corrupto: valores por defecto.
  }
  return DEFAULTS;
}

function saveChoices(choices: Choices): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choices));
  } catch {
    // Sin almacenamiento la elección no se recuerda.
  }
}

/** Diálogo «Exportar imagen»: formato, fondo y marco, con una vista previa del resultado. */
export function ExportDialog({
  title,
  onCancel,
  onExport,
}: {
  title: string;
  onCancel: () => void;
  onExport: (options: ImageExportOptions) => void;
}) {
  const [choices, setChoices] = useState<Choices>(readChoices);
  const set = (patch: Partial<Choices>) => setChoices((current) => ({ ...current, ...patch }));
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancel = useCallback(() => onCancel(), [onCancel]);
  useDialogBehavior(true, dialogRef, cancel);

  return (
    <div className="motion-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && cancel()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="export-title" tabIndex={-1} className="w-full max-w-md rounded-xl border border-line bg-surface shadow-panel outline-none">
        <header className="flex items-center border-b border-line px-5 py-3.5">
          <h2 id="export-title" className="text-sm font-semibold text-ink-900">
            Exportar imagen
          </h2>
          <button type="button" onClick={cancel} aria-label="Cerrar" className="ml-auto flex size-11 items-center justify-center rounded-md text-ink-400 hover:bg-raised hover:text-ink-900">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">
          <Preview choices={choices} title={title} />
          <Choice label="Formato" options={FORMATS} value={choices.format} onChange={(format) => set({ format })} />
          <Choice label="Fondo" options={BACKGROUNDS} value={choices.background} onChange={(background) => set({ background })} />
          <Choice label="Marco" options={FRAMES} value={choices.frame} onChange={(frame) => set({ frame })} />
          {choices.frame !== 'none' && (
            <div className="space-y-2.5 rounded-lg bg-canvas px-3 py-3">
              <BorderColorPicker value={choices.borderColor} onChange={(borderColor) => set({ borderColor })} />
              {MEASURES.map((measure) => (
                <label key={measure.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
                  <span className="text-xs text-ink-600">{measure.label}</span>
                  <span className="text-right text-xs tabular-nums text-ink-900">{choices[measure.key]} px</span>
                  <input
                    type="range"
                    min={measure.min}
                    max={measure.max}
                    step={measure.step}
                    value={choices[measure.key]}
                    onChange={(event) => set({ [measure.key]: Number(event.target.value) })}
                    className="col-span-2 accent-[var(--color-accent)]"
                  />
                </label>
              ))}
            </div>
          )}
          <p className="text-[11px] text-ink-400">Los candados, la selección y los puntos de edición no salen en la imagen.</p>
        </div>

        <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <button type="button" onClick={cancel} className="min-h-11 rounded-lg px-3.5 py-2 text-sm text-ink-600 hover:bg-raised">
            Cancelar
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => {
              saveChoices(choices);
              onExport({ ...choices, title });
            }}
            className="bg-brand rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Exportar {choices.format.toUpperCase()}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; hint: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const current = options.find((option) => option.value === value);
  return (
    <div role="radiogroup" aria-label={label}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</span>
      <div className="flex gap-1 rounded-lg bg-canvas p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs transition-colors ${
              value === option.value ? 'bg-surface font-medium text-accent shadow-sm' : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {current && <span className="mt-1 block text-[11px] text-ink-400">{current.hint}</span>}
    </div>
  );
}

/** Color del borde: automático (gris del tema), uno sugerido o cualquiera con el selector del sistema. */
function BorderColorPicker({ value, onChange }: { value: string | null; onChange: (color: string | null) => void }) {
  const custom = value !== null && !BORDER_COLORS.some((color) => color.value === value);
  const swatch = (selected: boolean) =>
    `size-6 shrink-0 rounded-full border border-line transition-shadow ${selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-canvas' : 'hover:ring-2 hover:ring-line'}`;
  return (
    <div role="radiogroup" aria-label="Color del borde" className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5">
      <span className="text-xs text-ink-600">Color del borde</span>
      <span className="text-right text-xs text-ink-900">{value === null ? 'Automático' : (BORDER_COLORS.find((color) => color.value === value)?.label ?? value)}</span>
      <div className="col-span-2 flex items-center gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          title="Automático: gris del tema del fondo"
          onClick={() => onChange(null)}
          className={swatch(value === null)}
          style={{ background: 'linear-gradient(135deg, #e4e4e7 50%, #52525b 50%)' }}
        />
        {BORDER_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            role="radio"
            aria-checked={value === color.value}
            aria-label={color.label}
            title={color.label}
            onClick={() => onChange(color.value)}
            className={swatch(value === color.value)}
            style={{ background: color.value }}
          />
        ))}
        <label title="Otro color" className={`${swatch(custom)} relative cursor-pointer overflow-hidden`} style={{ background: custom ? value! : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}>
          <input
            type="color"
            aria-label="Otro color"
            value={value ?? '#27272a'}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}

/** Miniatura de cómo saldrá: fondo (o cuadrícula de transparencia), marco y título. */
function Preview({ choices, title }: { choices: Choices; title: string }) {
  const dark = choices.background === 'dark';
  const ink = dark ? '#f4f4f5' : '#27272a';
  const background =
    choices.background === 'transparent'
      ? 'repeating-conic-gradient(#e4e4e7 0% 25%, #ffffff 0% 50%) 0 0 / 14px 14px'
      : dark
        ? '#18181b'
        : '#fafafa';
  const framed = choices.frame !== 'none';
  return (
    <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg border border-line" style={{ background }} aria-hidden>
      <div
        className="flex flex-col items-center gap-1.5"
        // La miniatura está a un cuarto de escala de la imagen real.
        style={{
          border: `${framed ? Math.max(choices.borderWidth / 4, choices.borderWidth > 0 ? 1 : 0) : 0}px solid ${choices.borderColor ?? (dark ? '#71717a' : '#a1a1aa')}`,
          borderRadius: choices.borderRadius / 4,
          padding: framed ? choices.padding / 4 : 12,
        }}
      >
        {choices.frame === 'titled' && (
          <span className="max-w-48 self-start truncate text-[10px] font-semibold" style={{ color: ink }}>
            {title || 'Diagrama'}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full" style={{ background: ink }} />
          <span className="h-px w-5" style={{ background: ink }} />
          <span className="rounded-md px-2 py-1 text-[9px]" style={{ border: `1.5px solid ${ink}`, color: ink }}>
            Acción
          </span>
          <span className="h-px w-5" style={{ background: ink }} />
          <span className="size-3 rotate-45" style={{ border: `1.5px solid ${ink}` }} />
        </div>
      </div>
    </div>
  );
}
