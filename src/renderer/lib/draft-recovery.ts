import { create } from 'zustand';
import { RECOVERY_ERROR, type DraftRecovery, type RecoveryAPI, type RecoveryWrite } from '../../shared/draft-recovery';
import { useWorkspaceStore, type DraftSession } from '../store/useWorkspaceStore';
import { hasUnsavedDraft, TEMPLATE_CATALOG } from './drafting';

export const useRecoveryStatus = create<{ message: string | null; error: boolean }>(() => ({ message: null, error: false }));
let retry = () => {};
export const retryDraftRecovery = () => retry();
export const dismissRecoveryNotice = () => useRecoveryStatus.setState((state) => (state.error ? state : { message: null, error: false }));

export function snapshotDraft(draft: DraftSession): DraftRecovery | null {
  if (!hasUnsavedDraft(draft) && (draft.record || draft.step === 'choose' || (!draft.template && !draft.sourceReview))) return null;
  return {
    version: 1, step: draft.step, source: draft.source, area: draft.area,
    templateId: draft.template?.id ?? null, fieldValues: draft.fieldValues,
    instructions: draft.instructions,
    referenceFileName: draft.referenceFile?.name ?? draft.missingReferenceFileName ?? null,
    sourceReview: draft.sourceReview, record: draft.record, dirty: draft.dirty,
  };
}

export function restoreDraft(snapshot: DraftRecovery): DraftSession {
  return {
    step: snapshot.step, source: snapshot.source, area: snapshot.area,
    template: TEMPLATE_CATALOG.find((template) => template.id === snapshot.templateId) ?? null,
    fieldValues: snapshot.fieldValues, instructions: snapshot.instructions,
    referenceFile: null, missingReferenceFileName: snapshot.referenceFileName,
    sourceReview: snapshot.sourceReview, record: snapshot.record, dirty: snapshot.dirty,
  };
}

// Se inicia una vez, antes de montar React: ninguna pantalla puede sobrescribir
// el estado recuperado durante la hidratación. No depende de StrictMode.
export async function startDraftRecovery(api: RecoveryAPI, target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window): Promise<() => void> {
  let sessionId: string | null = null;
  let revision = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let changed = false;
  const failure = (message = RECOVERY_ERROR) => useRecoveryStatus.setState({ message, error: true });
  try {
    const loaded = await api.load();
    sessionId = loaded.sessionId;
    if (loaded.snapshot) {
      useWorkspaceStore.setState({ draft: restoreDraft(loaded.snapshot) });
      useRecoveryStatus.setState({ message: 'Se recuperó tu redacción pendiente. Ábrela en Estudio, sección Generar.', error: false });
    }
    if (loaded.error) failure(loaded.error);
  } catch {
    failure('No se pudo iniciar la recuperación local. Guarda o exporta tu trabajo antes de salir.');
  }

  const request = (): RecoveryWrite => ({ sessionId: sessionId!, revision: ++revision, snapshot: snapshotDraft(useWorkspaceStore.getState().draft) });
  const save = async () => {
    clearTimeout(timer);
    timer = undefined;
    if (!sessionId) {
      try { sessionId = (await api.load()).sessionId; } catch { failure(); return; }
    }
    const write = request();
    try {
      const result = await api.save(write);
      // Una respuesta anterior no altera el estado de una copia más reciente.
      if (write.revision !== revision) return;
      if (!result.ok) { failure('message' in result ? result.message : RECOVERY_ERROR); return; }
      useRecoveryStatus.setState({ message: null, error: false });
    } catch { if (write.revision === revision) failure(); }
  };
  retry = () => {
    if (changed) void save();
    else {
      const previousDraft = useWorkspaceStore.getState().draft;
      void api.load().then((loaded) => {
        sessionId = loaded.sessionId;
        revision = 0;
        if (useWorkspaceStore.getState().draft !== previousDraft) { void save(); return; }
        if (loaded.error) { failure(loaded.error); return; }
        if (loaded.snapshot) useWorkspaceStore.setState({ draft: restoreDraft(loaded.snapshot) });
        useRecoveryStatus.setState({ message: loaded.snapshot ? 'Se recuperó tu redacción pendiente.' : null, error: false });
      }).catch(() => failure());
    }
  };
  const unsubscribe = useWorkspaceStore.subscribe((state, previous) => {
    if (state.draft === previous.draft) return;
    changed = true;
    // Máximo 400 ms entre copias incluso durante escritura continua.
    if (!timer) timer = setTimeout(() => void save(), 400);
  });
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (!changed) return; // Conserva una copia ilegible para recuperación manual.
    clearTimeout(timer);
    timer = undefined;
    try {
      if (!sessionId) throw new Error(RECOVERY_ERROR);
      const write = request();
      const result = api.flush(write);
      if (!result.ok) throw new Error(RECOVERY_ERROR);
    } catch {
      failure();
      event.preventDefault();
      event.returnValue = '';
    }
  };
  target.addEventListener('beforeunload', beforeUnload);
  return () => {
    clearTimeout(timer);
    unsubscribe();
    target.removeEventListener('beforeunload', beforeUnload);
    retry = () => {};
  };
}
