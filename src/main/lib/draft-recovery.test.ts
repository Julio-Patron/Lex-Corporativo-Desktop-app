import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { DraftRecovery } from '../../shared/draft-recovery';

const state = vi.hoisted(() => ({ root: '', available: true }));
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, renameSync: vi.fn(actual.renameSync) };
});
const key = randomBytes(32);
vi.mock('electron', () => ({
  app: { getPath: () => state.root },
  safeStorage: {
    isEncryptionAvailable: () => state.available,
    getSelectedStorageBackend: () => 'test-keyring',
    encryptString: (value: string) => {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), data]);
    },
    decryptString: (value: Buffer) => {
      const cipher = createDecipheriv('aes-256-gcm', key, value.subarray(0, 12));
      cipher.setAuthTag(value.subarray(12, 28));
      return Buffer.concat([cipher.update(value.subarray(28)), cipher.final()]).toString('utf8');
    },
  },
}));
import { readDraftRecovery, writeDraftRecovery, clearDraftRecovery, clearRecoveryForDocument } from './draft-recovery';
const snapshot: DraftRecovery = {
  version: 1, step: 'details', source: 'free', area: 'fiscal', templateId: null,
  fieldValues: { empresa: 'Datos confidenciales' }, instructions: 'Preparar contrato privado',
  referenceFileName: null, sourceReview: null, record: null, dirty: false,
};
beforeEach(() => { state.root = fs.mkdtempSync(join(tmpdir(), 'lex-recovery-')); state.available = true; });
afterEach(() => { fs.rmSync(state.root, { recursive: true, force: true }); vi.restoreAllMocks(); });

describe('almacenamiento cifrado de recuperación', () => {
  it('recupera exactamente el texto sin dejar contenido legible ni temporales', () => {
    writeDraftRecovery(snapshot);
    expect(readDraftRecovery(0)).toEqual(snapshot);
    expect(fs.readFileSync(join(state.root, 'draft-recovery.bin')).includes(Buffer.from(snapshot.instructions))).toBe(false);
    expect(fs.readdirSync(state.root)).toEqual(['draft-recovery.bin']);
  });
  it('rechaza datos inválidos y cifrado no disponible conservando la copia anterior', () => {
    writeDraftRecovery(snapshot);
    state.available = false;
    expect(() => writeDraftRecovery({ ...snapshot, instructions: 'Nuevo' })).toThrow();
    state.available = true;
    expect(() => writeDraftRecovery({ ...snapshot, version: 2 } as unknown as DraftRecovery)).toThrow();
    expect(readDraftRecovery(0)).toEqual(snapshot);
  });
  it('conserva la última copia si falla la sustitución del archivo', () => {
    writeDraftRecovery(snapshot);
    vi.mocked(fs.renameSync).mockImplementationOnce(() => { throw new Error('Disco ocupado'); });
    expect(() => writeDraftRecovery({ ...snapshot, instructions: 'Nuevo' })).toThrow();
    expect(readDraftRecovery(0)).toEqual(snapshot);
    expect(fs.existsSync(join(state.root, 'draft-recovery.bin.tmp'))).toBe(false);
  });
  it('informa corrupción sin borrar el archivo', () => {
    fs.writeFileSync(join(state.root, 'draft-recovery.bin'), 'corrupto');
    expect(() => readDraftRecovery(0)).toThrow();
    expect(fs.existsSync(join(state.root, 'draft-recovery.bin'))).toBe(true);
  });
  it('respeta la conservación configurada y permite eliminar sin cifrado', () => {
    writeDraftRecovery(snapshot);
    const old = new Date(Date.now() - 31 * 86_400_000);
    fs.utimesSync(join(state.root, 'draft-recovery.bin'), old, old);
    expect(readDraftRecovery(0)).toEqual(snapshot);
    expect(readDraftRecovery(30)).toBeNull();
    writeDraftRecovery(snapshot);
    state.available = false;
    clearDraftRecovery();
    expect(readDraftRecovery(0)).toBeNull();
  });
  it('elimina la recuperación del documento borrado sin afectar otros borradores', () => {
    const document: DraftRecovery = { ...snapshot, step: 'document', dirty: true, record: {
      id: 'doc-a', caseId: 'doc_case', title: 'Pendiente', area: 'fiscal', source: 'free',
      timestamp: '2026-10-15T12:00:00.000Z', updatedAt: '2026-10-15T12:00:00.000Z',
      document: 'Cambios', instructions: '', generatedWith: 'manual',
    } };
    writeDraftRecovery(document);
    clearRecoveryForDocument('otro');
    expect(readDraftRecovery(0)).toEqual(document);
    clearRecoveryForDocument('doc_case', 'doc-b');
    expect(readDraftRecovery(0)).toEqual(document);
    clearRecoveryForDocument('doc_case', 'doc-a');
    expect(readDraftRecovery(0)).toBeNull();
  });
});
