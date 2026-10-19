import { app, safeStorage } from 'electron';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { sanitizeForLocalCache } from './sanitizer';
import { DAMAGED_BACKUP, hashPortableBackupCore, type OpenedPortableBackup } from './portable-backup';
import { computeCaseRetentionUntil, type CaseRetentionDays } from '../../shared/case-retention';

export interface CaseMetadata {
  caseId: string;
  name: string;
  module: 'engineering' | 'fiscal' | 'mercantil';
  createdAt: string;
  updatedAt: string;
  retentionUntil?: string | null;
}

export interface VaultCase {
  metadata: CaseMetadata;
  documents: Array<{ fileName: string; mimeType: string }>;
  analyses: any[];
  drafts: any[];
  state: Record<string, unknown> | null;
}

type CaseModule = CaseMetadata['module'];

export interface VaultProtectionStatus {
  encryptionAvailable: boolean;
  backend: string;
  legacyPayloads: number;
  ready: boolean;
}

const CASE_ID_PATTERN = /^[a-zA-Z0-9-_]+$/;
const CASE_MODULES = new Set<CaseModule>(['engineering', 'fiscal', 'mercantil']);
const CASE_NOT_FOUND_MESSAGE = 'Selecciona un portafolio compatible o crea una nueva actividad.';
const CASE_MODULE_MISMATCH_MESSAGE = 'Este portafolio pertenece a otro ecosistema. Selecciona una actividad compatible o crea una nueva.';
const VAULT_ENCRYPTION_UNAVAILABLE_MESSAGE = 'La bóveda está bloqueada porque el cifrado seguro del sistema operativo no está disponible. Exporta o elimina los datos existentes desde un perfil compatible; no se guardará información nueva sin cifrado.';
const PAYLOAD_TABLES = ['documents', 'analyses', 'drafts', 'case_state'] as const;

function getSafeCaseLabel(caseId: string): string {
  return `${caseId.slice(0, 8)}...`;
}

function getVaultRoot(): string {
  // Use a fallback directory if app is not available (e.g. during testing)
  const root = app ? path.join(app.getPath('userData'), 'CaseVault') : path.join(process.cwd(), '.test-vault');
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  return root;
}

let db: Database.Database | null = null;

function getStorageBackend(): string {
  if (process.platform === 'win32') return 'dpapi';
  if (process.platform === 'darwin') return 'keychain';

  try {
    return typeof safeStorage?.getSelectedStorageBackend === 'function'
      ? safeStorage.getSelectedStorageBackend()
      : 'system-keyring';
  } catch {
    return 'unavailable';
  }
}

function isSecureStorageAvailable(): boolean {
  if (!safeStorage?.isEncryptionAvailable()) return false;
  return getStorageBackend() !== 'basic_text';
}

function requireSecureStorage(): void {
  if (!isSecureStorageAvailable()) {
    throw new Error(VAULT_ENCRYPTION_UNAVAILABLE_MESSAGE);
  }
}

function decodeLegacyObfuscatedPayload(value: string): string {
  return Buffer.from(value.slice('obfuscated:'.length), 'base64').toString('utf-8');
}

function migrateLegacyObfuscatedPayloads(database: Database.Database): number {
  if (!isSecureStorageAvailable()) return 0;
  let migrated = 0;
  const migrate = database.transaction(() => {
    for (const table of PAYLOAD_TABLES) {
      const rows = database
        .prepare(`SELECT rowid, payload FROM ${table} WHERE payload LIKE 'obfuscated:%'`)
        .all() as Array<{ rowid: number; payload: string }>;
      const update = database.prepare(`UPDATE ${table} SET payload = ? WHERE rowid = ?`);
      for (const row of rows) {
        const encrypted = `encrypted:v1:${safeStorage.encryptString(decodeLegacyObfuscatedPayload(row.payload)).toString('base64')}`;
        update.run(encrypted, row.rowid);
        migrated += 1;
      }
    }
  });
  migrate();
  if (migrated > 0) console.info(`[Vault] Migrated ${migrated} legacy payloads to OS encryption.`);
  return migrated;
}

function getDb(): Database.Database {
  if (db) return db;
  const vaultRoot = getVaultRoot();
  const dbPath = path.join(vaultRoot, 'vault.db');
  db = new Database(dbPath);

  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      caseId TEXT PRIMARY KEY,
      name TEXT,
      module TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      retentionUntil TEXT
    );
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caseId TEXT,
      fileName TEXT,
      mimeType TEXT,
      payload TEXT,
      FOREIGN KEY(caseId) REFERENCES cases(caseId) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caseId TEXT,
      analysisId TEXT,
      payload TEXT,
      FOREIGN KEY(caseId) REFERENCES cases(caseId) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caseId TEXT,
      draftId TEXT,
      payload TEXT,
      FOREIGN KEY(caseId) REFERENCES cases(caseId) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS case_state (
      caseId TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(caseId) REFERENCES cases(caseId) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_cases_updated_at ON cases(updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(caseId);
    CREATE INDEX IF NOT EXISTS idx_analyses_case_id ON analyses(caseId);
    CREATE INDEX IF NOT EXISTS idx_drafts_case_id ON drafts(caseId);
  `);

  const caseColumns = db.pragma('table_info(cases)') as Array<{ name: string }>;
  if (!caseColumns.some(column => column.name === 'retentionUntil')) {
    db.exec('ALTER TABLE cases ADD COLUMN retentionUntil TEXT');
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_cases_retention_until ON cases(retentionUntil)');

  // Existing installations can contain duplicates from retries. Keep the newest
  // payload before adding idempotency constraints.
  db.exec(`
    DELETE FROM analyses
    WHERE id NOT IN (SELECT MAX(id) FROM analyses GROUP BY caseId, analysisId);
    DELETE FROM drafts
    WHERE id NOT IN (SELECT MAX(id) FROM drafts GROUP BY caseId, draftId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_analyses_case_analysis ON analyses(caseId, analysisId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_drafts_case_draft ON drafts(caseId, draftId);
  `);
  migrateLegacyObfuscatedPayloads(db);
  migratePlaintextMetadata(db);

  return db;
}

function encryptPayload(plainText: string): string {
  requireSecureStorage();
  return `encrypted:v1:${safeStorage.encryptString(plainText).toString('base64')}`;
}

const UNREADABLE_CASE_NAME = 'No se pudo descifrar este asunto en este equipo';

function presentMetadata(row: CaseMetadata): CaseMetadata {
  // Un nombre cifrado por otro usuario de Windows no debe dejar inutilizable todo el portafolio:
  // el asunto se lista con un marcador y puede eliminarse; su contenido sigue protegido.
  try {
    return { ...row, name: decryptField(row.name) };
  } catch {
    return { ...row, name: UNREADABLE_CASE_NAME };
  }
}

function migratePlaintextMetadata(database: Database.Database): number {
  if (!isSecureStorageAvailable()) return 0;
  let migrated = 0;
  const migrate = database.transaction(() => {
    const cases = database
      .prepare(`SELECT caseId, name FROM cases WHERE name IS NOT NULL AND name NOT LIKE 'encrypted:v1:%'`)
      .all() as Array<{ caseId: string; name: string }>;
    const updateCase = database.prepare('UPDATE cases SET name = ? WHERE caseId = ?');
    for (const row of cases) {
      updateCase.run(encryptPayload(row.name), row.caseId);
      migrated += 1;
    }
    const documents = database
      .prepare(`SELECT id, fileName FROM documents WHERE fileName IS NOT NULL AND fileName NOT LIKE 'encrypted:v1:%'`)
      .all() as Array<{ id: number; fileName: string }>;
    const updateDocument = database.prepare('UPDATE documents SET fileName = ? WHERE id = ?');
    for (const row of documents) {
      updateDocument.run(encryptPayload(row.fileName), row.id);
      migrated += 1;
    }
  });
  migrate();
  if (migrated > 0) {
    database.pragma('wal_checkpoint(TRUNCATE)');
    database.exec('VACUUM');
  }
  return migrated;
}

function decryptField(value: string | null | undefined): string {
  if (!value) return '';
  if (value.startsWith('encrypted:v1:') || value.startsWith('obfuscated:')) return decryptPayload(value);
  return value;
}

function decryptPayload(encryptedText: string): string {
  if (encryptedText.startsWith('obfuscated:')) {
    return decodeLegacyObfuscatedPayload(encryptedText);
  }
  if (isSecureStorageAvailable()) {
    try {
      const payload = encryptedText.startsWith('encrypted:v1:')
        ? encryptedText.slice('encrypted:v1:'.length)
        : encryptedText;
      return safeStorage.decryptString(Buffer.from(payload, 'base64'));
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Vault] Local protection read failed.');
      }
      throw new Error('No se pudo descifrar el registro del portafolio.');
    }
  }
  throw new Error(VAULT_ENCRYPTION_UNAVAILABLE_MESSAGE);
}

export function getVaultProtectionStatus(): VaultProtectionStatus {
  const database = getDb();
  migrateLegacyObfuscatedPayloads(database);
  const legacyPayloads = PAYLOAD_TABLES.reduce((total, table) => {
    const row = database
      .prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE payload LIKE 'obfuscated:%'`)
      .get() as { count: number };
    return total + Number(row.count || 0);
  }, 0);
  const encryptionAvailable = isSecureStorageAvailable();
  return {
    encryptionAvailable,
    backend: getStorageBackend(),
    legacyPayloads,
    ready: encryptionAvailable && legacyPayloads === 0,
  };
}

function readCaseMetadata(caseId: string): CaseMetadata {
  const row = getDb().prepare('SELECT * FROM cases WHERE caseId = ?').get(caseId) as CaseMetadata | undefined;
  if (!row) {
    throw new Error(CASE_NOT_FOUND_MESSAGE);
  }
  return presentMetadata(row);
}

function assertCaseModule(caseId: string, expectedModule?: CaseModule): CaseMetadata {
  const metadata = readCaseMetadata(caseId);
  if (expectedModule && metadata.module !== expectedModule) {
    throw new Error(CASE_MODULE_MISMATCH_MESSAGE);
  }
  return metadata;
}

function updateCaseTimestamp(caseId: string): void {
  const timestamp = new Date().toISOString();
  getDb().prepare('UPDATE cases SET updatedAt = ? WHERE caseId = ?').run(timestamp, caseId);
}

export async function createCase(
  caseId: string,
  name: string,
  module: CaseModule,
  retentionUntil?: string,
): Promise<CaseMetadata> {
  requireSecureStorage();
  const timestamp = new Date().toISOString();
  const existed = Boolean(getDb().prepare('SELECT 1 FROM cases WHERE caseId = ?').get(caseId));
  getDb().prepare(`
    INSERT INTO cases (caseId, name, module, createdAt, updatedAt, retentionUntil)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(caseId) DO UPDATE SET
      name = excluded.name,
      module = excluded.module,
      updatedAt = excluded.updatedAt,
      retentionUntil = COALESCE(excluded.retentionUntil, cases.retentionUntil)
  `).run(caseId, encryptPayload(name), module, timestamp, timestamp, retentionUntil ?? null);

  if (!existed) {
    console.info(`[Vault] Local activity initialized (SQLite): ${getSafeCaseLabel(caseId)}`);
  }
  return readCaseMetadata(caseId);
}

export async function listCases(): Promise<CaseMetadata[]> {
  const rows = getDb().prepare('SELECT * FROM cases ORDER BY updatedAt DESC').all() as CaseMetadata[];
  return rows.map(presentMetadata);
}

export async function renameCase(caseId: string, name: string, expectedModule?: CaseModule): Promise<CaseMetadata> {
  assertCaseModule(caseId, expectedModule);

  const timestamp = new Date().toISOString();
  getDb()
    .prepare('UPDATE cases SET name = ?, updatedAt = ? WHERE caseId = ?')
    .run(encryptPayload(name), timestamp, caseId);

  console.info(`[Vault] Local activity renamed (SQLite): ${getSafeCaseLabel(caseId)}.`);
  return readCaseMetadata(caseId);
}

export async function saveDocument(caseId: string, fileName: string, mimeType: string, base64: string, expectedModule?: CaseModule): Promise<void> {
  assertCaseModule(caseId, expectedModule);
  
  const payloadStr = JSON.stringify({ fileName, mimeType, base64 });
  const encryptedPayload = encryptPayload(payloadStr);
  
  const stmt = getDb().prepare('INSERT INTO documents (caseId, fileName, mimeType, payload) VALUES (?, ?, ?, ?)');
  stmt.run(caseId, encryptPayload(fileName), mimeType, encryptedPayload);
  
  updateCaseTimestamp(caseId);
  console.info(`[Vault] Document saved locally (SQLite) for activity ${getSafeCaseLabel(caseId)}.`);
}

export async function saveAnalysis(caseId: string, analysisId: string, analysisData: any, expectedModule?: CaseModule): Promise<void> {
  assertCaseModule(caseId, expectedModule);
  
  const cleanData = sanitizeForLocalCache(analysisData);
  const encryptedPayload = encryptPayload(JSON.stringify(cleanData));
  
  getDb().prepare(`
    INSERT INTO analyses (caseId, analysisId, payload) VALUES (?, ?, ?)
    ON CONFLICT(caseId, analysisId) DO UPDATE SET payload = excluded.payload
  `).run(caseId, analysisId, encryptedPayload);
         
  updateCaseTimestamp(caseId);
  console.info(`[Vault] Analysis saved locally (SQLite) for activity ${getSafeCaseLabel(caseId)}.`);
}

export async function saveDraft(caseId: string, draftId: string, draftData: any, expectedModule?: CaseModule): Promise<void> {
  assertCaseModule(caseId, expectedModule);

  const cleanData = sanitizeForLocalCache(draftData);
  const encryptedPayload = encryptPayload(JSON.stringify(cleanData));

  getDb().prepare(`
    INSERT INTO drafts (caseId, draftId, payload) VALUES (?, ?, ?)
    ON CONFLICT(caseId, draftId) DO UPDATE SET payload = excluded.payload
  `).run(caseId, draftId, encryptedPayload);

  updateCaseTimestamp(caseId);
  console.info(`[Vault] Draft saved locally (SQLite) for activity ${getSafeCaseLabel(caseId)}.`);
}

function removeArtifactFromSavedState(
  caseId: string,
  artifactId: string,
  historyKeys: string[],
  deletedPayload?: Record<string, any>,
): void {
  const stateRow = getDb().prepare('SELECT payload FROM case_state WHERE caseId = ?').get(caseId) as { payload: string } | undefined;
  if (!stateRow) return;

  try {
    const state = JSON.parse(decryptPayload(stateRow.payload)) as Record<string, any>;
    for (const historyKey of historyKeys) {
      if (Array.isArray(state[historyKey])) {
        state[historyKey] = state[historyKey].filter((item: any) => String(item?.id || item?.requestId || '') !== artifactId);
      }
    }
    if (state.fiscalDraftState?.linkedAnalysisId === artifactId) {
      state.fiscalDraftState = { ...state.fiscalDraftState, linkedAnalysisId: undefined };
    }
    if (deletedPayload?.generatedDoc) {
      for (const draftStateKey of ['engineeringDraftState', 'fiscalDraftState']) {
        if (state[draftStateKey]?.generatedDoc === deletedPayload.generatedDoc) {
          state[draftStateKey] = { ...state[draftStateKey], generatedDoc: '' };
        }
      }
    }
    const updatedAt = new Date().toISOString();
    getDb().prepare('UPDATE case_state SET payload = ?, updatedAt = ? WHERE caseId = ?')
      .run(encryptPayload(JSON.stringify(sanitizeForLocalCache(state))), updatedAt, caseId);
  } catch {
    // A corrupt legacy state must not prevent deletion from the authoritative tables.
  }
}

export async function getAnalysis(caseId: string, analysisId: string, expectedModule?: CaseModule): Promise<unknown | null> {
  assertCaseModule(caseId, expectedModule);
  const row = getDb().prepare('SELECT payload FROM analyses WHERE caseId = ? AND analysisId = ?').get(caseId, analysisId) as { payload: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(decryptPayload(row.payload));
  } catch {
    return null;
  }
}

export async function deleteAnalysis(caseId: string, analysisId: string, expectedModule?: CaseModule): Promise<boolean> {
  assertCaseModule(caseId, expectedModule);
  const result = getDb().prepare('DELETE FROM analyses WHERE caseId = ? AND analysisId = ?').run(caseId, analysisId);
  if (result.changes > 0) {
    removeArtifactFromSavedState(caseId, analysisId, ['fiscalAnalysisHistory', 'engineeringAnalysisHistory']);
    updateCaseTimestamp(caseId);
    console.info(`[Vault] Analysis deleted locally (SQLite) for activity ${getSafeCaseLabel(caseId)}.`);
  }
  return result.changes > 0;
}

export async function deleteDraft(caseId: string, draftId: string, expectedModule?: CaseModule): Promise<boolean> {
  assertCaseModule(caseId, expectedModule);
  const row = getDb().prepare('SELECT payload FROM drafts WHERE caseId = ? AND draftId = ?').get(caseId, draftId) as { payload: string } | undefined;
  let deletedPayload: Record<string, any> | undefined;
  if (row) {
    try {
      deletedPayload = JSON.parse(decryptPayload(row.payload));
    } catch {
      deletedPayload = undefined;
    }
  }
  const result = getDb().prepare('DELETE FROM drafts WHERE caseId = ? AND draftId = ?').run(caseId, draftId);
  if (result.changes > 0) {
    removeArtifactFromSavedState(caseId, draftId, ['engineeringDraftingHistory', 'fiscalDraftingHistory'], deletedPayload);
    updateCaseTimestamp(caseId);
    console.info(`[Vault] Draft deleted locally (SQLite) for activity ${getSafeCaseLabel(caseId)}.`);
  }
  return result.changes > 0;
}

export async function saveCaseState(
  caseId: string,
  stateData: Record<string, unknown>,
  expectedModule?: CaseModule,
): Promise<void> {
  assertCaseModule(caseId, expectedModule);

  const cleanData = sanitizeForLocalCache(stateData);
  const encryptedPayload = encryptPayload(JSON.stringify(cleanData));
  const updatedAt = new Date().toISOString();

  getDb().prepare(`
    INSERT INTO case_state (caseId, payload, updatedAt) VALUES (?, ?, ?)
    ON CONFLICT(caseId) DO UPDATE SET payload = excluded.payload, updatedAt = excluded.updatedAt
  `).run(caseId, encryptedPayload, updatedAt);

  updateCaseTimestamp(caseId);
}

export async function exportCase(caseId: string, expectedModule?: CaseModule): Promise<string> {
  return readExportedCase(caseId, expectedModule);
}

export class VaultRestoreConflict extends Error {
  readonly conflictCount: number;

  constructor(conflictCount: number) {
    super('El respaldo contiene asuntos que ya existen con otro contenido.');
    this.name = 'VaultRestoreConflict';
    this.conflictCount = conflictCount;
  }
}

function contentFingerprint(exported: Record<string, unknown>): string {
  const { exportMetadata, ...content } = exported;
  return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');
}

function assertRestorableCase(entry: any): void {
  const metadata = entry?.metadata;
  if (!metadata || typeof metadata.caseId !== 'string' || !CASE_ID_PATTERN.test(metadata.caseId)) throw new Error(DAMAGED_BACKUP);
  if (typeof metadata.name !== 'string' || metadata.name.length < 1) throw new Error(DAMAGED_BACKUP);
  if (typeof metadata.createdAt !== 'string' || typeof metadata.updatedAt !== 'string') throw new Error(DAMAGED_BACKUP);
  if (!CASE_MODULES.has(metadata.module)) throw new Error(DAMAGED_BACKUP);
  if (!Array.isArray(entry.documents) || !Array.isArray(entry.analyses) || !Array.isArray(entry.drafts)) throw new Error(DAMAGED_BACKUP);
  const keys = entry.recordKeys;
  if (!keys || !Array.isArray(keys.analyses) || keys.analyses.length !== entry.analyses.length) throw new Error(DAMAGED_BACKUP);
  if (!Array.isArray(keys.drafts) || keys.drafts.length !== entry.drafts.length) throw new Error(DAMAGED_BACKUP);
  for (const document of entry.documents) {
    if (!document || typeof document.fileName !== 'string' || typeof document.mimeType !== 'string') throw new Error(DAMAGED_BACKUP);
  }
  for (const id of [...keys.analyses, ...keys.drafts]) {
    if (typeof id !== 'string' || id.length < 1) throw new Error(DAMAGED_BACKUP);
  }
}

function insertRestoredCase(entry: any): void {
  const metadata = entry.metadata;
  getDb().prepare(`
    INSERT INTO cases (caseId, name, module, createdAt, updatedAt, retentionUntil)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    metadata.caseId,
    encryptPayload(metadata.name),
    metadata.module,
    metadata.createdAt,
    metadata.updatedAt,
    metadata.retentionUntil ?? null,
  );
  const insertDocument = getDb().prepare('INSERT INTO documents (caseId, fileName, mimeType, payload) VALUES (?, ?, ?, ?)');
  for (const document of entry.documents) {
    insertDocument.run(metadata.caseId, encryptPayload(document.fileName), document.mimeType, encryptPayload(JSON.stringify(document)));
  }
  const insertAnalysis = getDb().prepare('INSERT INTO analyses (caseId, analysisId, payload) VALUES (?, ?, ?)');
  entry.analyses.forEach((analysis: unknown, index: number) => {
    insertAnalysis.run(metadata.caseId, entry.recordKeys.analyses[index], encryptPayload(JSON.stringify(analysis)));
  });
  const insertDraft = getDb().prepare('INSERT INTO drafts (caseId, draftId, payload) VALUES (?, ?, ?)');
  entry.drafts.forEach((draft: unknown, index: number) => {
    insertDraft.run(metadata.caseId, entry.recordKeys.drafts[index], encryptPayload(JSON.stringify(draft)));
  });
  if (entry.state) {
    getDb().prepare('INSERT INTO case_state (caseId, payload, updatedAt) VALUES (?, ?, ?)').run(
      metadata.caseId,
      encryptPayload(JSON.stringify(entry.state)),
      metadata.updatedAt,
    );
  }
}

export async function restoreVaultBackup(
  payload: OpenedPortableBackup,
  mode: 'abort' | 'replace' = 'abort',
): Promise<{ restored: number; skipped: number; replaced: number }> {
  requireSecureStorage();
  const { packageHash, ...core } = payload;
  if (
    payload?.format !== 'lex-corporativo-vault-backup'
    || payload.formatVersion !== 1
    || !Array.isArray(payload.cases)
    || payload.caseCount !== payload.cases.length
    || hashPortableBackupCore(core) !== packageHash
  ) {
    throw new Error(DAMAGED_BACKUP);
  }

  let restored = 0;
  let skipped = 0;
  let replaced = 0;
  let conflicts = 0;
  const apply = getDb().transaction(() => {
    for (const entry of payload.cases as any[]) {
      assertRestorableCase(entry);
      const caseId = entry.metadata.caseId as string;
      const exists = Boolean(getDb().prepare('SELECT 1 FROM cases WHERE caseId = ?').get(caseId));
      if (!exists) {
        insertRestoredCase(entry);
        restored += 1;
        continue;
      }
      const current = JSON.parse(readExportedCase(caseId)) as Record<string, unknown>;
      if (contentFingerprint(current) === contentFingerprint(entry)) {
        skipped += 1;
        continue;
      }
      if (mode === 'replace') {
        getDb().prepare('DELETE FROM cases WHERE caseId = ?').run(caseId);
        insertRestoredCase(entry);
        replaced += 1;
        continue;
      }
      conflicts += 1;
    }
    if (conflicts > 0) throw new VaultRestoreConflict(conflicts);
  });
  apply();
  return { restored, skipped, replaced };
}

function readExportedCase(caseId: string, expectedModule?: CaseModule): string {
  const metadata = assertCaseModule(caseId, expectedModule);
  const result: VaultCase = {
    metadata,
    documents: [],
    analyses: [],
    drafts: [],
    state: null,
  };
  return JSON.stringify(fillExportedCase(result, caseId));
}

function fillExportedCase(result: VaultCase, caseId: string): VaultCase {
  const docs = getDb().prepare('SELECT payload FROM documents WHERE caseId = ? ORDER BY id').all(caseId) as Array<{ payload: string }>;
  for (const doc of docs) result.documents.push(JSON.parse(decryptPayload(doc.payload)));

  const analyses = getDb().prepare('SELECT analysisId, payload FROM analyses WHERE caseId = ? ORDER BY id').all(caseId) as Array<{ analysisId: string; payload: string }>;
  for (const analysis of analyses) result.analyses.push(JSON.parse(decryptPayload(analysis.payload)));

  const drafts = getDb().prepare('SELECT draftId, payload FROM drafts WHERE caseId = ? ORDER BY id').all(caseId) as Array<{ draftId: string; payload: string }>;
  for (const draft of drafts) result.drafts.push(JSON.parse(decryptPayload(draft.payload)));

  (result as VaultCase & { recordKeys: { analyses: string[]; drafts: string[] } }).recordKeys = {
    analyses: analyses.map(analysis => analysis.analysisId),
    drafts: drafts.map(draft => draft.draftId),
  };

  const stateRow = getDb().prepare('SELECT payload FROM case_state WHERE caseId = ?').get(caseId) as { payload: string } | undefined;
  if (stateRow) result.state = JSON.parse(decryptPayload(stateRow.payload));

  const exportMetadata: { timestamp: string; version: string; packageHash?: string } = {
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  };
  (result as VaultCase & { exportMetadata: typeof exportMetadata }).exportMetadata = exportMetadata;
  exportMetadata.packageHash = crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex');
  return result;
}

export async function deleteCase(caseId: string, expectedModule?: CaseModule): Promise<void> {
  assertCaseModule(caseId, expectedModule);
  
  getDb().prepare('DELETE FROM cases WHERE caseId = ?').run(caseId);
  console.info(`[Vault] Local activity deleted (SQLite): ${getSafeCaseLabel(caseId)}`);
}

// Recalcula el vencimiento de todos los asuntos según la política vigente:
// con 0 días se conservan indefinidamente; en otro caso vencen N días después
// de su última actividad.
export async function applyRetentionPolicy(retentionDays: CaseRetentionDays): Promise<number> {
  const database = getDb();
  const rows = database
    .prepare('SELECT caseId, updatedAt, retentionUntil FROM cases')
    .all() as Array<{ caseId: string; updatedAt: string | null; retentionUntil: string | null }>;
  const update = database.prepare('UPDATE cases SET retentionUntil = ? WHERE caseId = ?');
  let changed = 0;
  database.transaction(() => {
    for (const row of rows) {
      const next = computeCaseRetentionUntil(row.updatedAt || new Date(), retentionDays);
      if (next !== (row.retentionUntil ?? null)) {
        update.run(next, row.caseId);
        changed += 1;
      }
    }
  })();
  return changed;
}

export async function purgeExpiredCases(nowIso = new Date().toISOString()): Promise<number> {
  const result = getDb()
    .prepare('DELETE FROM cases WHERE retentionUntil IS NOT NULL AND retentionUntil <= ?')
    .run(nowIso);
  if (result.changes > 0) {
    console.info(`[Vault] Purged ${result.changes} expired local activities.`);
  }
  return result.changes;
}

export async function deleteAllCases(): Promise<number> {
  const result = getDb().prepare('DELETE FROM cases').run();
  console.info(`[Vault] Deleted ${result.changes} local activities.`);
  return result.changes;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

