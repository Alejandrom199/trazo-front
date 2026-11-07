import { useEffect, useRef, type RefObject } from 'react';

function focusable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
    (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1,
  );
}

/** Encierra el tabulador en un diálogo y lo cierra con Escape. */
export function useDialogBehavior(active: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const items = focusable(root);
    (items[0] ?? root).focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !root) return;
      const current = focusable(root);
      if (current.length === 0) {
        event.preventDefault();
        return;
      }
      const first = current[0]!;
      const last = current[current.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    root.addEventListener('keydown', onKey);
    return () => {
      root.removeEventListener('keydown', onKey);
      previouslyFocused?.focus();
    };
  }, [active, ref]);
}
