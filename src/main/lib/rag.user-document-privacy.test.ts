import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as lancedb from '@lancedb/lancedb';

const privacyRoot = path.join(process.cwd(), '.tmp-rag-privacy-test');
const state = vi.hoisted(() => ({ encryption: true }));

vi.mock('electron', () => ({
  app: {
    getPath: () => privacyRoot,
    getAppPath: () => process.cwd(),
    isPackaged: false,
  },
  safeStorage: {
    isEncryptionAvailable: () => state.encryption,
    encryptString: (value: string) => Buffer.from(`sealed:${value}`, 'utf8'),
    decryptString: (payload: Buffer) => {
      const text = Buffer.from(payload).toString('utf8');
      if (!text.startsWith('sealed:')) throw new Error('sello inválido');
      return text.slice('sealed:'.length);
    },
  },
}));

vi.mock('@xenova/transformers', () => ({
  pipeline: async () => async () => ({ data: Float32Array.from([0.1, 0.2, 0.3]) }),
  env: {},
}));

function containsText(directory: string, marker: string): boolean {
  if (!fs.existsSync(directory)) return false;
  return fs.readdirSync(directory, { withFileTypes: true }).some(entry => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory()
      ? containsText(absolute, marker)
      : entry.isFile() && fs.readFileSync(absolute).includes(Buffer.from(marker));
  });
}

describe('cifrado de fragmentos temporales', () => {
  const marker = 'SYNTHETIC_PRIVATE_VECTOR_CONTENT';
  const fileName = 'secreto-8f3a.txt';

  beforeEach(() => {
    state.encryption = true;
    fs.rmSync(privacyRoot, { recursive: true, force: true });
  });

  afterEach(() => {
    fs.rmSync(privacyRoot, { recursive: true, force: true });
  });

  it('no deja el texto ni el nombre en claro y los recupera al buscar', async () => {
    const { indexUserDocument, searchUserDocuments } = await import('./rag');
    await indexUserDocument({
      requestId: 'request-secret',
      fileName,
      contentHash: 'hash-secret',
      module: 'fiscal',
      chunks: [{ text: marker, chunkIndex: 0, pageNumber: 1 }],
    });

    const dbPath = path.join(privacyRoot, 'lance_data');
    expect(containsText(dbPath, marker)).toBe(false);
    expect(containsText(dbPath, fileName)).toBe(false);

    const db = await lancedb.connect(dbPath);
    const table = await db.openTable('user_documents');
    const [row] = await table.query().limit(1).toArray();
    expect(String(row.content).startsWith('encrypted:v1:')).toBe(true);
    expect(String(row.fileName).startsWith('encrypted:v1:')).toBe(true);
    table.close();
    db.close();

    const matches = await searchUserDocuments('fiscal', 'request-secret', [0.1, 0.2, 0.3], 4);
    expect(matches.map(match => match.content)).toEqual([marker]);
    expect(matches.map(match => match.fileName)).toEqual([fileName]);
  });

  it('no indexa en claro cuando el cifrado del sistema no está disponible', async () => {
    state.encryption = false;
    const { indexUserDocument } = await import('./rag');
    await expect(indexUserDocument({
      requestId: 'request-secret',
      fileName,
      contentHash: 'hash-secret',
      module: 'fiscal',
      chunks: [{ text: marker, chunkIndex: 0, pageNumber: 1 }],
    })).rejects.toThrow(/cifrado del sistema no está disponible/);
    expect(containsText(path.join(privacyRoot, 'lance_data'), marker)).toBe(false);
  });
});
