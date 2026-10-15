import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveDraftRecord } from './portfolio';
import type { DraftRecord } from '../types';
const record: DraftRecord = {
  id: 'doc-nuevo', title: 'Contrato', source: 'free', area: 'mercantil',
  timestamp: '2026-10-15T12:00:00.000Z', updatedAt: '2026-10-15T12:00:00.000Z',
  instructions: '', document: 'Primero', generatedWith: 'manual',
};
afterEach(() => vi.unstubAllGlobals());
describe('guardado concurrente de documentos', () => {
  it('serializa escrituras del mismo documento y reutiliza el asunto al reintentar', async () => {
    const documents: string[] = [];
    const cases = { createCase: vi.fn(async () => undefined), saveDraft: vi.fn(async ({ draftData }) => { documents.push(draftData.document); }) };
    vi.stubGlobal('window', { lexDesktop: { cases } });
    const [first, second] = await Promise.all([saveDraftRecord(record), saveDraftRecord({ ...record, document: 'Último' })]);
    expect(documents).toEqual(['Primero', 'Último']);
    expect(first.caseId).toBe(second.caseId);
    const retried = await saveDraftRecord({ ...record, document: 'Recuperado tras reinicio' });
    expect(retried.caseId).toBe(first.caseId);
  });
  it('una escritura fallida no bloquea la siguiente ni modifica un asunto existente', async () => {
    const cases = { createCase: vi.fn(async () => undefined), saveDraft: vi.fn().mockRejectedValueOnce(new Error('Disco lleno')).mockResolvedValueOnce({ success: true }) };
    vi.stubGlobal('window', { lexDesktop: { cases } });
    const saved = { ...record, caseId: 'doc_legacy' };
    const first = saveDraftRecord(saved);
    const second = saveDraftRecord({ ...saved, document: 'Reintento' });
    await expect(first).rejects.toThrow('Disco lleno');
    expect((await second).caseId).toBe('doc_legacy');
  });
});
