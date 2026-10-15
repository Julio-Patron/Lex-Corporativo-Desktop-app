import { beforeEach, describe, expect, it } from 'vitest';
import { hasUnsavedDraft } from '../lib/drafting';
import { normalizeDraftRecord } from '../lib/portfolio';
import type { DraftRecord } from '../types';
import { useWorkspaceStore } from './useWorkspaceStore';

const original: DraftRecord = {
  id: 'doc-original', caseId: 'doc-asunto', title: 'Contrato en preparación', area: 'mercantil',
  timestamp: '2026-10-15T12:00:00.000Z', updatedAt: '2026-10-15T12:00:00.000Z',
  source: 'template', instructions: '', document: '# Mi contrato\n\nTexto ya capturado.', generatedWith: 'template',
};

beforeEach(() => useWorkspaceStore.getState().resetDraft());

describe('continuidad del trabajo con citas normativas', () => {
  it('incorpora una cita al documento abierto conservando su identidad y los cambios pendientes', () => {
    const store = useWorkspaceStore.getState();
    store.setDraftDocument(original, { saved: true });
    store.editDraftDocument('# Mi contrato\n\nÚltima edición sin guardar.');

    expect(store.addLegalCitation('CCom · Artículo 1: texto citado.', 'fiscal')).toBe('document');
    const draft = useWorkspaceStore.getState().draft;
    expect(draft.record).toMatchObject({ id: original.id, caseId: original.caseId, title: original.title, area: 'mercantil' });
    expect(draft.record.document).toContain('Última edición sin guardar.');
    expect(draft.record.document).toContain('CCom · Artículo 1');
    expect(draft.dirty).toBe(true);
    expect(draft.step).toBe('document');
  });

  it('conserva el formulario cuando se añade una fuente antes de generar', () => {
    const store = useWorkspaceStore.getState();
    store.startDraft('free', { area: 'fiscal' });
    store.updateDraft({ instructions: 'Preparar una consulta.', fieldValues: { parte: 'Empresa de prueba' } });

    expect(store.addLegalCitation('CFF · Artículo 1', 'mercantil')).toBe('instructions');
    expect(useWorkspaceStore.getState().draft).toMatchObject({
      step: 'details', source: 'free', area: 'fiscal', record: null,
      fieldValues: { parte: 'Empresa de prueba' },
    });
    expect(useWorkspaceStore.getState().draft.instructions).toContain('Preparar una consulta.');
    expect(useWorkspaceStore.getState().draft.instructions).toContain('CFF · Artículo 1');
  });

  it('permite guardar una primera cita sin exigir una API ni iniciar generación', () => {
    useWorkspaceStore.getState().addLegalCitation('LIVA · Artículo 1: cita íntegra.', 'fiscal');
    const draft = useWorkspaceStore.getState().draft;
    expect(draft.step).toBe('document');
    expect(draft.record).toMatchObject({ area: 'fiscal', generatedWith: 'manual', source: 'free' });
    expect(draft.record.document).toContain('LIVA · Artículo 1: cita íntegra.');
    expect(draft.record.caseId).toBeUndefined();
    expect(normalizeDraftRecord(draft.record, 'doc-guardado', original.timestamp)?.generatedWith).toBe('manual');
  });

  it('distingue un documento guardado de una edición o un formulario pendientes al sustituir trabajo', () => {
    const store = useWorkspaceStore.getState();
    expect(hasUnsavedDraft(store.draft)).toBe(false);
    store.setDraftDocument(original, { saved: true });
    expect(hasUnsavedDraft(useWorkspaceStore.getState().draft)).toBe(false);
    store.editDraftDocument('Cambio pendiente');
    expect(hasUnsavedDraft(useWorkspaceStore.getState().draft)).toBe(true);
    store.resetDraft();
    store.startDraft('free');
    store.updateDraft({ instructions: 'No perder estas instrucciones.' });
    expect(hasUnsavedDraft(useWorkspaceStore.getState().draft)).toBe(true);
  });
});
