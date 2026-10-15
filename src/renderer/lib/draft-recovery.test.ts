import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startDraftRecovery, snapshotDraft, restoreDraft, useRecoveryStatus } from './draft-recovery';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import type { RecoveryAPI, RecoveryResult } from '../../shared/draft-recovery';
import { TEMPLATE_CATALOG } from './drafting';

let dispose: (() => void) | undefined;
const target = new EventTarget();
let api: RecoveryAPI;
beforeEach(() => {
  vi.useFakeTimers();
  useWorkspaceStore.getState().resetDraft();
  useRecoveryStatus.setState({ message: null, error: false });
  api = {
    load: vi.fn(async () => ({ sessionId: 'session', snapshot: null })),
    save: vi.fn(async () => ({ ok: true as const })),
    flush: vi.fn(() => ({ ok: true as const })),
  };
});
afterEach(() => { dispose?.(); dispose = undefined; vi.useRealTimers(); });
const start = async () => { dispose = await startDraftRecovery(api, target as unknown as Window); };

describe('recuperación del trabajo pendiente', () => {
  it('restaura campos, plantilla e instrucciones sin serializar el archivo adjunto', () => {
    const store = useWorkspaceStore.getState();
    store.startDraft('template', { template: TEMPLATE_CATALOG[0] });
    store.updateDraft({ fieldValues: { parte: 'Empresa' }, instructions: 'Conservar condiciones', referenceFile: new File(['texto privado'], 'contrato.pdf') });
    const snapshot = snapshotDraft(useWorkspaceStore.getState().draft)!;
    expect(JSON.stringify(snapshot)).not.toContain('texto privado');
    const restored = restoreDraft(JSON.parse(JSON.stringify(snapshot)));
    expect(restored).toMatchObject({ fieldValues: { parte: 'Empresa' }, instructions: 'Conservar condiciones', referenceFile: null, missingReferenceFileName: 'contrato.pdf' });
    expect(restored.template.id).toBe(TEMPLATE_CATALOG[0].id);
    expect(snapshotDraft(restored).referenceFileName).toBe('contrato.pdf');
  });

  it('hidrata antes de suscribirse y conserva una copia ilegible si no hubo cambios', async () => {
    api.load = vi.fn(async () => ({ sessionId: 'session', snapshot: null, error: 'Copia ilegible' }));
    await start();
    target.dispatchEvent(new Event('beforeunload', { cancelable: true }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.save).not.toHaveBeenCalled();
    expect(api.flush).not.toHaveBeenCalled();
    expect(useRecoveryStatus.getState().message).toBe('Copia ilegible');
  });

  it('conserva la edición más reciente al cerrar antes del temporizador', async () => {
    await start();
    useWorkspaceStore.getState().addLegalCitation('Texto inicial');
    useWorkspaceStore.getState().editDraftDocument('Última edición');
    target.dispatchEvent(new Event('beforeunload', { cancelable: true }));
    expect(api.flush).toHaveBeenCalledWith(expect.objectContaining({ snapshot: expect.objectContaining({ record: expect.objectContaining({ document: 'Última edición' }) }) }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.save).not.toHaveBeenCalled();
  });

  it('guarda periódicamente aunque el usuario siga escribiendo', async () => {
    await start();
    useWorkspaceStore.getState().startDraft('free');
    for (let i = 0; i < 10; i++) {
      useWorkspaceStore.getState().updateDraft({ instructions: `Texto ${i}` });
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(api.save).toHaveBeenCalledTimes(2);
  });

  it('bloquea el cierre si la copia falla y admite un reintento', async () => {
    await start();
    useWorkspaceStore.getState().addLegalCitation('No perder');
    api.flush = vi.fn(() => ({ ok: false, message: 'Disco lleno' }));
    const event = new Event('beforeunload', { cancelable: true });
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(useRecoveryStatus.getState().error).toBe(true);
    api.flush = vi.fn(() => ({ ok: true as const }));
    const next = new Event('beforeunload', { cancelable: true });
    target.dispatchEvent(next);
    expect(next.defaultPrevented).toBe(false);
  });

  it('ignora la respuesta tardía de una escritura anterior al cierre', async () => {
    let finish!: (value: RecoveryResult) => void;
    api.save = vi.fn(() => new Promise<RecoveryResult>(resolve => { finish = resolve; }));
    await start();
    useWorkspaceStore.getState().addLegalCitation('Versión anterior');
    await vi.advanceTimersByTimeAsync(400);
    useWorkspaceStore.getState().editDraftDocument('Versión final');
    target.dispatchEvent(new Event('beforeunload', { cancelable: true }));
    finish({ ok: false, message: 'Error obsoleto' });
    await Promise.resolve();
    expect(useRecoveryStatus.getState().error).toBe(false);
  });

  it('borra la copia al descartar y al confirmar el guardado en Portafolio', async () => {
    await start();
    const store = useWorkspaceStore.getState();
    store.addLegalCitation('Borrador');
    await vi.advanceTimersByTimeAsync(400);
    const record = useWorkspaceStore.getState().draft.record!;
    store.setDraftDocument({ ...record, caseId: 'doc-guardado' }, { saved: true });
    await vi.advanceTimersByTimeAsync(400);
    expect(api.save).toHaveBeenLastCalledWith(expect.objectContaining({ snapshot: null }));
    store.editDraftDocument('Nueva edición');
    await vi.advanceTimersByTimeAsync(400);
    store.resetDraft();
    target.dispatchEvent(new Event('beforeunload', { cancelable: true }));
    expect(api.flush).toHaveBeenLastCalledWith(expect.objectContaining({ snapshot: null }));
  });
});
