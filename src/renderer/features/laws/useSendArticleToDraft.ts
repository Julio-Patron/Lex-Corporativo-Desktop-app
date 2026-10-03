import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LegalArea } from '../../lib/legal-areas';
import { useUiStore } from '../../store/useUiStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

// Lleva una disposición a las instrucciones del redactor.
export function useSendArticleToDraft() {
  const navigate = useNavigate();
  const notify = useUiStore((state) => state.notify);
  return useCallback((citation: string, area?: LegalArea) => {
    useWorkspaceStore.getState().appendDraftInstructions(`FUNDAMENTO A CONSIDERAR:\n${citation}`, area);
    notify('El artículo se agregó a las instrucciones del documento.', 'success', 'Redactar');
    navigate('/redactar');
  }, [navigate, notify]);
}
