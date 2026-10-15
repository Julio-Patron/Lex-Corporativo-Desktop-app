import { startDraftRecovery } from '../../src/renderer/lib/draft-recovery';
import { useWorkspaceStore } from '../../src/renderer/store/useWorkspaceStore';
import { saveDraftRecord } from '../../src/renderer/lib/portfolio';

async function save() {
  const snapshot = useWorkspaceStore.getState().draft.record!;
  const saved = await saveDraftRecord(snapshot);
  const current = useWorkspaceStore.getState().draft;
  if (current.record?.id === snapshot.id) useWorkspaceStore.getState().updateDraft({
    record: { ...current.record, caseId: saved.caseId },
    dirty: current.record.document !== snapshot.document || current.record.title !== snapshot.title,
  });
}

void startDraftRecovery(window.lexDesktop.recovery).then(() => {
  Object.assign(window, {
    recoveryTest: {
      state: () => useWorkspaceStore.getState().draft,
      form: () => {
        const store = useWorkspaceStore.getState();
        store.startDraft('file', { area: 'fiscal' });
        store.updateDraft({ instructions: 'Instrucciones que deben sobrevivir', fieldValues: { parte: 'Empresa de prueba' }, referenceFile: new File(['privado'], 'base.pdf') });
      },
      document: () => {
        const store = useWorkspaceStore.getState();
        store.resetDraft();
        store.addLegalCitation('Primera cita');
        store.editDraftDocument('Última edición antes de cerrar');
      },
      edit: (text: string) => useWorkspaceStore.getState().editDraftDocument(text),
      reset: () => useWorkspaceStore.getState().resetDraft(),
      save,
      startSave: () => { void save(); },
    },
  });
});
