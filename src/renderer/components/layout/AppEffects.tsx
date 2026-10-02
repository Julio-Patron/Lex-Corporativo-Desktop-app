import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveDraftRecord } from '../../lib/portfolio';
import { useUiStore } from '../../store/useUiStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

const AUTOSAVE_DELAY_MS = 1_500;

// Suscripciones globales: estado del sistema, menú nativo, actualizaciones y
// guardado automático del documento abierto una vez que existe en el portafolio.
export function AppEffects() {
  const navigate = useNavigate();
  const draftRecord = useWorkspaceStore((state) => state.draft.record);
  const draftDirty = useWorkspaceStore((state) => state.draft.dirty);

  useEffect(() => {
    const ui = useUiStore.getState();
    void ui.refreshRuntimeHealth();
    void ui.refreshSettings();

    const unsubscribers = [
      window.lexDesktop.navigation.onSettings(() => navigate('/configuracion')),
      window.lexDesktop.settings.onUpdateAvailable((version) => useUiStore.getState().setUpdate({ status: 'available', version })),
      window.lexDesktop.settings.onUpdateDownloaded(() => {
        const current = useUiStore.getState().update;
        useUiStore.getState().setUpdate({ status: 'downloaded', version: current.status === 'available' ? current.version : undefined });
      }),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [navigate]);

  useEffect(() => {
    if (!draftRecord?.caseId || !draftDirty) return;
    const snapshot = draftRecord;
    const timer = setTimeout(() => {
      saveDraftRecord(snapshot)
        .then((saved) => {
          const { draft, updateDraft } = useWorkspaceStore.getState();
          if (draft.record?.id !== saved.id) return;
          const unchanged = draft.record.document === snapshot.document;
          updateDraft({ record: { ...draft.record, caseId: saved.caseId, updatedAt: saved.updatedAt }, dirty: !unchanged });
        })
        .catch((error: Error) => {
          useUiStore.getState().notify(error.message || 'No se pudieron guardar los cambios.', 'error', 'Guardado automático');
        });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draftRecord, draftDirty]);

  return null;
}
