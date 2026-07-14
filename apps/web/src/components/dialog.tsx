'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@duo/ui';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Boîte de dialogue accessible basée sur l'élément natif <dialog>.
 * Gère le focus trap, la fermeture via Échap et le clic sur le fond natif.
 */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleCancel = (e: Event) => {
      // Échap déclenche "cancel" nativement ; on intercepte pour piloter l'état React.
      e.preventDefault();
      onClose();
    };

    const handleClick = (e: MouseEvent) => {
      // Clic sur le fond (le <dialog> lui-même, pas son contenu) ferme la boîte.
      if (e.target === el) {
        onClose();
      }
    };

    el.addEventListener('cancel', handleCancel);
    el.addEventListener('click', handleClick);
    return () => {
      el.removeEventListener('cancel', handleCancel);
      el.removeEventListener('click', handleClick);
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      className={cn(
        'w-full max-w-lg rounded-lg border border-border bg-surface p-0 text-text shadow-xl',
        'backdrop:bg-bg/60 backdrop:backdrop-blur-sm',
        'transition-all duration-base',
        className,
      )}
      onClose={onClose}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 id="dialog-title" className="text-sm font-semibold tracking-tight">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="rounded-md p-1 text-text-muted transition-colors duration-base hover:bg-surface-2 hover:text-text"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
