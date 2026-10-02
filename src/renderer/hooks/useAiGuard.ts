import { useCallback } from 'react';
import { selectAiReady, useUiStore } from '../store/useUiStore';

// Devuelve true si la IA está conectada; si no, abre el diálogo de conexión.
export function useAiGuard() {
  const aiReady = useUiStore(selectAiReady);
  const requestProcessingSetup = useUiStore((state) => state.requestProcessingSetup);
  const ensureAi = useCallback((intent: string) => {
    if (aiReady) return true;
    requestProcessingSetup(intent);
    return false;
  }, [aiReady, requestProcessingSetup]);
  return { aiReady, ensureAi };
}
