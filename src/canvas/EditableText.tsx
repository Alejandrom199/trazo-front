import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

interface EditableTextProps {
  initialValue: string;
  /** Con multilínea, Mayús+Enter inserta un salto; Enter solo confirma. */
  multiline: boolean;
  placeholder?: string;
  className?: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}

/**
 * Campo de texto en el lugar. Enter o perder el foco confirman; Escape cancela.
 * `nodrag nopan nowheel` le dicen a React Flow que no arrastre ni haga zoom
 * mientras se escribe.
 */
export function EditableText({ initialValue, multiline, placeholder, className = '', onCommit, onCancel }: EditableTextProps) {
  const [value, setValue] = useState(initialValue);
  const finished = useRef(false);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function finish(commit: boolean) {
    if (finished.current) return;
    finished.current = true;
    if (commit) onCommit(value.trim());
    else onCancel();
  }

  function handleKeyDown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === 'Escape') finish(false);
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      finish(true);
    }
  }

  const shared = {
    ref,
    value,
    placeholder,
    onChange: (event: { target: { value: string } }) => setValue(event.target.value),
    onKeyDown: handleKeyDown,
    onBlur: () => finish(true),
    // La alineación se hereda de la figura: centrada en una acción, a la izquierda en una nota.
    className: `nodrag nopan nowheel field-sizing-content resize-none bg-transparent [text-align:inherit] outline-none ${className}`,
  };

  return multiline ? <textarea rows={1} {...shared} /> : <input {...shared} />;
}
