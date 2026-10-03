import React, { useId } from 'react';
import { X } from 'lucide-react';
import { useUiStore } from '../../store/useUiStore';
import { Modal } from '../ui';
import { ApiKeyForm } from './ApiKeyForm';

// Se abre cuando una acción necesita IA y no hay un proveedor conectado.
export function ProcessingSetupDialog() {
  const intent = useUiStore((state) => state.processingSetupIntent);
  const dismiss = useUiStore((state) => state.dismissProcessingSetup);
  const titleId = useId();

  return (
    <Modal isOpen={Boolean(intent)} onClose={dismiss} labelledBy={titleId} className="max-w-xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-slate-950">Conecta tu IA para continuar</h2>
          <p className="mt-1 text-sm text-slate-600">
            Para {intent} se necesita la API key de tu proveedor. El proveedor recibe sólo el texto necesario para esa operación.
          </p>
        </div>
        <button type="button" onClick={dismiss} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
          <X size={18} />
        </button>
      </div>
      <ApiKeyForm onConnected={dismiss} />
    </Modal>
  );
}
