import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
  placement?: 'center' | 'right';
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
const openModals: HTMLElement[] = [];
const originalInert = new Map<HTMLElement, boolean>();
let originalOverflow = '';

function updateBackground() {
  const top = openModals.at(-1);
  if (!top) {
    originalInert.forEach((inert, element) => { element.inert = inert; });
    originalInert.clear();
    document.body.style.overflow = originalOverflow;
    return;
  }
  for (const element of Array.from(document.body.children)) {
    if (!(element instanceof HTMLElement)) continue;
    if (!originalInert.has(element)) originalInert.set(element, element.inert);
    element.inert = element === top.parentElement ? originalInert.get(element)! : true;
  }
  document.body.style.overflow = 'hidden';
}

function focusableElements(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden' && !element.closest('[inert]'));
}

export function Modal({ isOpen, onClose, children, className, labelledBy, placement = 'center' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const dialog = modalRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (openModals.length === 0) originalOverflow = document.body.style.overflow;
    openModals.push(dialog);
    // El resto de la página y los diálogos inferiores quedan fuera del teclado
    // y del árbol de accesibilidad mientras este diálogo está al frente.
    updateBackground();
    const focusFirst = () => (focusableElements(dialog)[0] ?? dialog).focus();
    focusFirst();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (openModals.at(-1) !== dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = focusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        last.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === last) {
        first.focus();
        event.preventDefault();
      }
    };

    const handleFocus = (event: FocusEvent) => {
      if (openModals.at(-1) === dialog && !dialog.contains(event.target as Node)) focusFirst();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocus);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocus);
      const index = openModals.indexOf(dialog);
      if (index !== -1) openModals.splice(index, 1);
      updateBackground();
      if (previouslyFocused?.isConnected && !previouslyFocused.closest('[inert]')) previouslyFocused.focus();
      else {
        const remaining = openModals.at(-1);
        if (remaining) (focusableElements(remaining)[0] ?? remaining).focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className={cn('app-modal-layer fixed inset-x-0 bottom-0 z-[120] flex', placement === 'right' ? 'justify-end' : 'items-center justify-center p-4')}>
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn('app-dialog relative z-10 min-h-0 w-full bg-white shadow-dialog outline-none', placement === 'right' ? 'flex h-full max-w-md flex-col' : 'max-w-lg overflow-y-auto rounded-xl p-6', className)}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export const ModalHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-4 flex flex-col gap-1.5', className)} {...props} />
);

export const ModalTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn('text-lg font-semibold text-slate-950', className)} {...props} />
);

export const ModalContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('py-2', className)} {...props} />
);

export const ModalFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
);
