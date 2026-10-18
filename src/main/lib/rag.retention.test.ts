import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as lancedb from '@lancedb/lancedb';

const ragRoot = path.join(process.cwd(), '.tmp-rag-retention-test');

function containsText(directory: string, marker: string): boolean {
  if (!fs.existsSync(directory)) return false;
  return fs.readdirSync(directory, { withFileTypes: true }).some(entry => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory()
      ? containsText(absolute, marker)
      : entry.isFile() && fs.readFileSync(absolute).includes(Buffer.from(marker));
  });
}

vi.mock('electron', () => ({
  app: {
    getPath: () => ragRoot,
    getAppPath: () => process.cwd(),
    isPackaged: false,
  },
}));

describe('temporary LanceDB document retention', () => {
  beforeEach(() => {
    fs.rmSync(ragRoot, { recursive: true, force: true });
  });

  afterEach(() => {
    fs.rmSync(ragRoot, { recursive: true, force: true });
  });

  it('purges only chunks older than the configured TTL', async () => {
    const dbPath = path.join(ragRoot, 'lance_data');
    fs.mkdirSync(dbPath, { recursive: true });
    const db = await lancedb.connect(dbPath);
    const created = await db.createTable('user_documents', [
      {
        id: 'old',
        requestId: 'request-old',
        indexedAt: '2026-07-12T00:00:00.000Z',
        content: 'fragmento vencido',
        vector: [0.1, 0.2],
      },
      {
        id: 'fresh',
        requestId: 'request-fresh',
        indexedAt: '2026-07-14T00:00:00.000Z',
        content: 'fragmento vigente',
        vector: [0.2, 0.1],
      },
    ]);
    created.close();
    db.close();

    const { cleanupUserDocumentRequest, purgeExpiredUserDocuments, USER_DOCUMENT_TTL_MS } = await import('./rag');
    const deleted = await purgeExpiredUserDocuments(USER_DOCUMENT_TTL_MS, Date.parse('2026-07-14T12:00:00.000Z'));

    const verificationDb = await lancedb.connect(dbPath);
    const table2 = await verificationDb.openTable('user_documents');
    const remaining = await table2.query().where('id IS NOT NULL').limit(10).toArray();

    expect(remaining.map(row => row.id)).toEqual(['fresh']);
    expect(deleted).toBe(1);
    table2.close();
    verificationDb.close();

    await cleanupUserDocumentRequest('request-fresh');
    const cleanupDb = await lancedb.connect(dbPath);
    const cleanedTable = await cleanupDb.openTable('user_documents');
    expect(await cleanedTable.countRows()).toBe(0);
    cleanedTable.close();
    cleanupDb.close();
  });

  it('borra el texto del fragmento eliminado y deja la tabla vacía en cero filas', async () => {
    const marker = 'SYNTHETIC_PRIVATE_VECTOR_CONTENT';
    const dbPath = path.join(ragRoot, 'lance_data');
    fs.mkdirSync(dbPath, { recursive: true });
    const db = await lancedb.connect(dbPath);
    const created = await db.createTable('user_documents', [{
      id: 'secret',
      requestId: 'request-secret',
      indexedAt: '2026-07-14T00:00:00.000Z',
      content: marker,
      vector: [0.3, 0.4],
    }]);
    created.close();
    db.close();
    expect(containsText(dbPath, marker)).toBe(true);

    const { cleanupUserDocumentRequest } = await import('./rag');
    await cleanupUserDocumentRequest('request-secret');

    const verificationDb = await lancedb.connect(dbPath);
    const table = await verificationDb.openTable('user_documents');
    expect(await table.countRows()).toBe(0);
    table.close();
    verificationDb.close();
    expect(containsText(dbPath, marker)).toBe(false);
    expect(fs.existsSync(path.join(dbPath, 'legal_knowledge.lance'))).toBe(false);
  });

  it('rejects invalid retention periods', async () => {
    const { purgeExpiredUserDocuments } = await import('./rag');
    await expect(purgeExpiredUserDocuments(0)).rejects.toThrow(/mayor a cero/);
  });
});
