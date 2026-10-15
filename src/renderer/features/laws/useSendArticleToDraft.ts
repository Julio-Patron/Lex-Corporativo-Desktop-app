import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LegalArea } from '../../lib/legal-areas';
import { useUiStore } from '../../store/useUiStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

// Incorpora la cita al documento abierto o a las instrucciones en preparación.
export function useSendArticleToDraft() {
  const navigate = useNavigate();
  const notify = useUiStore((state) => state.notify);
  return useCallback((citation: string, area?: LegalArea) => {
    const destination = useWorkspaceStore.getState().addLegalCitation(citation, area);
    notify(destination === 'document' ? 'La cita se agregó al documento. Puedes revisarla, guardarla y exportarla.' : 'La cita se agregó a las instrucciones; los datos que ya capturaste se conservan.', 'success', 'Redactar');
    navigate('/redactar');
  }, [navigate, notify]);
}
