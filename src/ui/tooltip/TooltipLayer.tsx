import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { placeTooltip, splitShortcut } from './tooltipLayout';

/** Pausa antes de mostrar el primero; si ya hay uno visible, el siguiente aparece sin espera. */
const SHOW_DELAY_MS = 450;
/** Tras ocultarse, durante este tiempo el siguiente también aparece sin espera. */
const WARM_MS = 300;

/**
 * Qué muestra tooltip: lo que tenga `title` (o `data-tooltip`, donde se guarda al
 * quitarle el title para que no salga el nativo) y los botones de solo icono, con
 * su aria-label. `data-no-tooltip` lo desactiva en un elemento y lo que contiene.
 */
const CANDIDATE = '[title], [data-tooltip], button[aria-label], [role="button"][aria-label], a[aria-label]';

function tooltipTarget(from: EventTarget | null): HTMLElement | null {
  if (!(from instanceof Element)) return null;
  const element = from.closest<HTMLElement>(CANDIDATE);
  if (!element || element.closest('[data-no-tooltip]')) return null;
  return textOf(element) ? element : null;
}

/** El texto del tooltip. Mueve el title a data-tooltip para que el navegador no muestre el suyo. */
function textOf(element: HTMLElement): string {
  const title = element.getAttribute('title');
  if (title) {
    element.removeAttribute('title');
    element.dataset.tooltip = title;
    // Si el title era su único nombre accesible, se conserva como aria-label.
    if (!element.getAttribute('aria-label') && !element.textContent?.trim()) element.setAttribute('aria-label', title);
  }
  if (element.dataset.tooltip) return element.dataset.tooltip;
  // Botón de solo icono: su aria-label es lo único que dice qué hace.
  return element.textContent?.trim() ? '' : (element.getAttribute('aria-label') ?? '');
}

interface Shown {
  text: string;
  anchor: DOMRect;
}

/**
 * Tooltip único para toda la app: aparece al pasar el ratón (o al llegar con el
 * teclado) sobre cualquier elemento con title o sobre un botón de solo icono.
 * Debajo y centrado (encima si no cabe); se oculta al hacer clic, desplazarse o
 * pulsar una tecla. En pantallas táctiles no aparece.
 */
export function TooltipLayer() {
  const [shown, setShown] = useState<Shown | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  // El efecto de abajo lee si hay uno visible sin volver a suscribirse.
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    let current: HTMLElement | null = null;
    let timer: number | undefined;
    let warmUntil = 0;

    const hide = () => {
      window.clearTimeout(timer);
      if (current) warmUntil = Date.now() + WARM_MS;
      current = null;
      setShown(null);
    };
    const showFor = (element: HTMLElement) => {
      if (element === current) return;
      window.clearTimeout(timer);
      current = element;
      const reveal = () => {
        if (current !== element || !element.isConnected) return;
        setShown({ text: textOf(element), anchor: element.getBoundingClientRect() });
      };
      if (Date.now() < warmUntil || shownRef.current) reveal();
      else timer = window.setTimeout(reveal, SHOW_DELAY_MS);
    };

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const target = tooltipTarget(event.target);
      if (target) showFor(target);
      else if (current) hide();
    };
    const onPointerOut = (event: PointerEvent) => {
      if (current && !(event.relatedTarget instanceof Node && current.contains(event.relatedTarget))) hide();
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = tooltipTarget(event.target);
      if (target?.matches(':focus-visible')) showFor(target);
    };

    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', hide);
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('keydown', hide, true);
    document.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('pointerdown', hide, true);
      document.removeEventListener('keydown', hide, true);
      document.removeEventListener('scroll', hide, true);
      window.removeEventListener('blur', hide);
    };
  }, []);

  // Se mide ya dibujado (invisible) y se coloca antes de pintarlo.
  useLayoutEffect(() => {
    if (!shown || !ref.current) return setPosition(null);
    const { width, height } = ref.current.getBoundingClientRect();
    setPosition(placeTooltip(shown.anchor, { width, height }, { width: window.innerWidth, height: window.innerHeight }));
  }, [shown]);

  if (!shown) return null;
  const { label, shortcut } = splitShortcut(shown.text);
  return (
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-[100] flex w-max max-w-xs items-center gap-2 rounded-md bg-ink-900 px-2.5 py-1.5 text-xs leading-snug text-surface shadow-panel"
      style={position ? { left: position.left, top: position.top, animation: 'trazo-fade-in var(--duration-fast, 120ms) ease-out' } : { left: 0, top: 0, visibility: 'hidden' }}
    >
      <span>{label}</span>
      {shortcut && <kbd className="rounded border border-surface/25 px-1.5 py-px font-sans text-[11px] text-surface/80">{shortcut}</kbd>}
    </div>
  );
}
