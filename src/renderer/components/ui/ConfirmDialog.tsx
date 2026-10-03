import React, { useId } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  return (
    <Modal isOpen={isOpen} onClose={onCancel} labelledBy={titleId}>
      <ModalHeader>
        <div className="flex items-center gap-2">
          {variant === 'danger'
            ? <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
            : <Info className="h-5 w-5 text-blue-600" aria-hidden="true" />}
          <ModalTitle id={titleId}>{title}</ModalTitle>
        </div>
      </ModalHeader>
      <ModalContent>
        <p className="text-sm leading-relaxed text-slate-700">{message}</p>
      </ModalContent>
      <ModalFooter>
        <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
      </ModalFooter>
    </Modal>
  );
}
