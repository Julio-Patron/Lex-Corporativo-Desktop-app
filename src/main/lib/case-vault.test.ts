import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { openPortableBackup, sealPortableBackup } from './portable-backup';

const mockState = {
  isEncryptionAvailable: true,
  backend: 'dpapi',
  testVaultPath: path.join(process.cwd(), 'temp_test_vault'),
};

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') return mockState.testVaultPath;
      return '';
    },
  },
  safeStorage: {
    isEncryptionAvailable: () => mockState.isEncryptionAvailable,
    getSelectedStorageBackend: () => mockState.backend,
    encryptString: (str: string) => Buffer.from('encrypted:' + str, 'utf-8'),
    decryptString: (buf: Buffer) => {
      const text = buf.toString('utf-8');
      // Simula un registro cifrado por otro usuario de Windows: DPAPI no puede abrirlo.
      if (text.includes('OTRO_PERFIL')) throw new Error('DPAPI: clave de otro usuario');
      return text.slice('encrypted:'.length);
    },
  },
}));

const require = createRequire(import.meta.url);
const sqliteNativeAvailableInNode = (() => {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(':memory:');
    db.close();
    return true;
  } catch (error) {
    if (process.env.LEX_REQUIRE_NODE_SQLITE === '1') throw error;
    return false;
  }
})();

const describeVault = sqliteNativeAvailableInNode ? describe : describe.skip;
let vault: typeof import('./case-vault') | null = null;

describeVault('Local Case Vault', () => {
  beforeEach(() => {
    mockState.isEncryptionAvailable = true;
    mockState.backend = 'dpapi';
    vault?.closeDb(); // Close any lingering connections
    if (fs.existsSync(mockState.testVaultPath)) {
      fs.rmSync(mockState.testVaultPath, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    vault?.closeDb(); // Always close SQLite connection so the folder can be deleted
    if (fs.existsSync(mockState.testVaultPath)) {
      fs.rmSync(mockState.testVaultPath, { recursive: true, force: true });
    }
  });

  it('blocks new cases when secure OS encryption is unavailable', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = false;

    await expect(vault.createCase('case_123', 'Test Case 1', 'mercantil'))
      .rejects.toThrow('cifrado seguro del sistema operativo no está disponible');
    expect(vault.getVaultProtectionStatus().ready).toBe(false);
  });

  it('keeps the portfolio usable when one case name cannot be decrypted on this profile', async () => {
    vault = await import('./case-vault');
    await vault.createCase('case_ok', 'Asunto legible', 'fiscal');
    await vault.createCase('case_foreign', 'OTRO_PERFIL asunto ajeno', 'fiscal');

    const cases = await vault.listCases();
    expect(cases.map(item => item.caseId).sort()).toEqual(['case_foreign', 'case_ok']);
    expect(cases.find(item => item.caseId === 'case_ok')?.name).toBe('Asunto legible');
    expect(cases.find(item => item.caseId === 'case_foreign')?.name).toMatch(/no se pudo descifrar/i);
    expect(cases.find(item => item.caseId === 'case_foreign')?.nameUnreadable).toBe(true);
    expect(cases.find(item => item.caseId === 'case_ok')?.nameUnreadable).toBeUndefined();
    // El marcador nunca debe viajar a un respaldo: exportar ese asunto falla de forma explícita.
    await expect(vault.exportCase('case_foreign')).rejects.toThrow(/descifrar/);
    await expect(vault.deleteCase('case_foreign')).resolves.toBeUndefined();
    expect((await vault.listCases()).length).toBe(1);
  });

  it('creates and lists cases using OS safeStorage encryption when available', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    await vault.createCase('case_456', 'Secure Case 2', 'fiscal');

    const cases = await vault.listCases();
    expect(cases.length).toBe(1);
    expect(cases[0].name).toBe('Secure Case 2');
    expect(cases[0].module).toBe('fiscal');
  });

  it('saves, lists, and exports documents, analyses, and drafts securely', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    await vault.createCase('case_test', 'Full Test Case', 'mercantil');
    await vault.saveDocument('case_test', 'evidence.pdf', 'application/pdf', 'dummy-base64-content', 'mercantil');
    await vault.saveAnalysis('case_test', 'report_1', { summary: 'Risks found' }, 'mercantil');
    await vault.saveDraft('case_test', 'draft_1', { templateTitle: 'NDA', generatedDoc: 'Documento generado' }, 'mercantil');

    const cases = await vault.listCases();
    expect(cases.length).toBe(1);

    const exported = await vault.exportCase('case_test', 'mercantil');
    const parsed = JSON.parse(exported);

    expect(parsed.metadata.name).toBe('Full Test Case');
    expect(parsed.documents.length).toBe(1);
    expect(parsed.documents[0].fileName).toBe('evidence.pdf');
    expect(parsed.documents[0].base64).toBe('dummy-base64-content');
    expect(parsed.analyses.length).toBe(1);
    expect(parsed.analyses[0].summary).toBe('Risks found');
    expect(parsed.drafts.length).toBe(1);
    expect(parsed.drafts[0].templateTitle).toBe('NDA');
    expect(parsed.drafts[0].generatedDoc).toBe('Documento generado');
  });

  it('updates case metadata without deleting child records', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    const original = await vault.createCase('case_upsert', 'Original', 'fiscal');
    await vault.saveAnalysis('case_upsert', 'analysis_1', { summary: 'Persistente' }, 'fiscal');
    await vault.saveDraft('case_upsert', 'draft_1', { generatedDoc: 'Persistente' }, 'fiscal');

    for (let index = 0; index < 10; index += 1) {
      await vault.createCase('case_upsert', `Actualizada ${index}`, 'fiscal');
    }

    const exported = JSON.parse(await vault.exportCase('case_upsert', 'fiscal'));
    expect(exported.metadata.createdAt).toBe(original.createdAt);
    expect(exported.metadata.name).toBe('Actualizada 9');
    expect(exported.analyses).toHaveLength(1);
    expect(exported.drafts).toHaveLength(1);
  });

  it('persists case state and replaces retried analysis and draft payloads idempotently', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    await vault.createCase('case_state', 'Estado', 'fiscal');
    await vault.saveAnalysis('case_state', 'analysis_1', { summary: 'v1' }, 'fiscal');
    await vault.saveAnalysis('case_state', 'analysis_1', { summary: 'v2' }, 'fiscal');
    await vault.saveDraft('case_state', 'draft_1', { generatedDoc: 'v1' }, 'fiscal');
    await vault.saveDraft('case_state', 'draft_1', { generatedDoc: 'v2' }, 'fiscal');
    await vault.saveCaseState('case_state', {
      fiscalChatHistory: [{ role: 'user', text: 'Consulta persistida' }],
      fiscalDraftingHistory: [{ id: 'draft_1' }],
    }, 'fiscal');

    const exported = JSON.parse(await vault.exportCase('case_state', 'fiscal'));
    expect(exported.analyses).toEqual([{ summary: 'v2' }]);
    expect(exported.drafts).toEqual([{ generatedDoc: 'v2' }]);
    expect(exported.state.fiscalChatHistory[0].text).toBe('Consulta persistida');
  });

  it('deletes one generated analysis or draft without deleting the case', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    await vault.createCase('case_artifacts', 'Artefactos', 'fiscal');
    await vault.saveAnalysis('case_artifacts', 'analysis_1', { id: 'analysis_1', summary: 'Eliminar' }, 'fiscal');
    await vault.saveAnalysis('case_artifacts', 'analysis_2', { id: 'analysis_2', summary: 'Conservar' }, 'fiscal');
    await vault.saveDraft('case_artifacts', 'draft_1', { id: 'draft_1', generatedDoc: 'Eliminar' }, 'fiscal');
    await vault.saveDraft('case_artifacts', 'draft_2', { id: 'draft_2', generatedDoc: 'Conservar' }, 'fiscal');
    await vault.saveCaseState('case_artifacts', {
      fiscalAnalysisHistory: [{ id: 'analysis_1' }, { id: 'analysis_2' }],
      fiscalDraftingHistory: [{ id: 'draft_1' }, { id: 'draft_2' }],
      fiscalDraftState: { linkedAnalysisId: 'analysis_1', generatedDoc: 'Eliminar' },
    }, 'fiscal');

    expect(await vault.deleteAnalysis('case_artifacts', 'analysis_1', 'fiscal')).toBe(true);
    expect(await vault.deleteDraft('case_artifacts', 'draft_1', 'fiscal')).toBe(true);
    expect(await vault.deleteAnalysis('case_artifacts', 'missing', 'fiscal')).toBe(false);

    const exported = JSON.parse(await vault.exportCase('case_artifacts', 'fiscal'));
    expect(exported.analyses.map((item: any) => item.id)).toEqual(['analysis_2']);
    expect(exported.drafts.map((item: any) => item.id)).toEqual(['draft_2']);
    expect(exported.state.fiscalAnalysisHistory).toEqual([{ id: 'analysis_2' }]);
    expect(exported.state.fiscalDraftingHistory).toEqual([{ id: 'draft_2' }]);
    expect(exported.state.fiscalDraftState.linkedAnalysisId).toBeUndefined();
    expect(exported.state.fiscalDraftState.generatedDoc).toBe('');
    expect(await vault.listCases()).toHaveLength(1);
  });

  it('purges only activities whose retention date has expired', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    await vault.createCase('case_expired', 'Vencida', 'fiscal', '2026-01-01T00:00:00.000Z');
    await vault.createCase('case_active', 'Activa', 'fiscal', '2027-01-01T00:00:00.000Z');
    const deleted = await vault.purgeExpiredCases('2026-07-14T00:00:00.000Z');

    expect(deleted).toBe(1);
    expect((await vault.listCases()).map(item => item.caseId)).toEqual(['case_active']);
  });

  it('applies the configured retention policy to existing activities', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    await vault.createCase('case_legacy', 'Heredada', 'engineering', '2026-01-01T00:00:00.000Z');
    await vault.applyRetentionPolicy(0);
    expect((await vault.listCases())[0].retentionUntil).toBeNull();
    expect(await vault.purgeExpiredCases('2030-01-01T00:00:00.000Z')).toBe(0);

    await vault.applyRetentionPolicy(30);
    const [metadata] = await vault.listCases();
    const expected = new Date(new Date(metadata.updatedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(metadata.retentionUntil).toBe(expected);
  });

  it('deletes cases clean and completely from the workspace', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    await vault.createCase('case_delete', 'Delete Me', 'fiscal');
    const casesBefore = await vault.listCases();
    expect(casesBefore.length).toBe(1);

    await vault.deleteCase('case_delete', 'fiscal');
    
    const casesAfter = await vault.listCases();
    expect(casesAfter.length).toBe(0);
  });

  it('renames cases without changing their ecosystem', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    await vault.createCase('case_rename', 'Original', 'mercantil');
    const renamed = await vault.renameCase('case_rename', 'Renombrado', 'mercantil');

    expect(renamed.name).toBe('Renombrado');
    expect(renamed.module).toBe('mercantil');

    const cases = await vault.listCases();
    expect(cases[0].name).toBe('Renombrado');
  });

  it('stores case names and file names only in encrypted form', async () => {
    vault = await import('./case-vault');
    const caseName = 'ClienteSentinela-9f3a';
    const fileName = 'ContratoSentinela-9f3a.pdf';
    await vault.createCase('case_meta', caseName, 'fiscal');
    await vault.saveDocument('case_meta', fileName, 'application/pdf', 'contenido', 'fiscal');

    expect((await vault.listCases())[0].name).toBe(caseName);
    vault.closeDb();
    const stored = readVaultFiles();
    expect(stored).not.toContain(caseName);
    expect(stored).not.toContain(fileName);
  });

  it('encrypts legacy plaintext names when the vault opens', async () => {
    vault = await import('./case-vault');
    await vault.createCase('case_legacy_name', 'Temporal', 'mercantil');
    await vault.saveDocument('case_legacy_name', 'temporal.pdf', 'application/pdf', 'contenido', 'mercantil');
    vault.closeDb();
    const Database = require('better-sqlite3');
    const database = new Database(path.join(mockState.testVaultPath, 'CaseVault', 'vault.db'));
    database.prepare('UPDATE cases SET name = ? WHERE caseId = ?').run('ClienteVisible-4c2b', 'case_legacy_name');
    database.prepare('UPDATE documents SET fileName = ?').run('EscrituraVisible-4c2b.pdf');
    database.close();

    expect((await vault.listCases())[0].name).toBe('ClienteVisible-4c2b');
    expect(JSON.parse(await vault.exportCase('case_legacy_name', 'mercantil')).documents[0].fileName).toBe('temporal.pdf');
    vault.closeDb();
    const migrated = new Database(path.join(mockState.testVaultPath, 'CaseVault', 'vault.db'));
    const row = migrated.prepare('SELECT name FROM cases WHERE caseId = ?').get('case_legacy_name') as { name: string };
    const document = migrated.prepare('SELECT fileName FROM documents').get() as { fileName: string };
    migrated.close();
    expect(row.name.startsWith('encrypted:v1:')).toBe(true);
    expect(document.fileName.startsWith('encrypted:v1:')).toBe(true);
    const stored = readVaultFiles();
    expect(stored).not.toContain('ClienteVisible-4c2b');
    expect(stored).not.toContain('EscrituraVisible-4c2b.pdf');
  });

  it('restores a sealed backup, skips a repeat, and rolls back conflicts and damaged files', async () => {
    vault = await import('./case-vault');
    await vault.createCase('case_keep', 'Conservar', 'fiscal');
    await vault.createCase('case_backup', 'Asunto original', 'mercantil');
    await vault.saveDocument('case_backup', 'anexo.pdf', 'application/pdf', 'pdf-bytes', 'mercantil');
    await vault.saveAnalysis('case_backup', 'analysis_1', { id: 'analysis_1', summary: 'Original' }, 'mercantil');
    await vault.saveDraft('case_backup', 'draft_1', { id: 'draft_1', generatedDoc: 'Texto' }, 'mercantil');
    await vault.saveCaseState('case_backup', { note: 'estado' }, 'mercantil');
    const exported = JSON.parse(await vault.exportCase('case_backup', 'mercantil'));
    const opened = openBackup([exported]);

    await vault.deleteCase('case_backup', 'mercantil');
    expect(await vault.restoreVaultBackup(opened)).toEqual({ restored: 1, skipped: 0, replaced: 0 });
    expect((await vault.restoreVaultBackup(opened)).skipped).toBe(1);

    const roundTrip = JSON.parse(await vault.exportCase('case_backup', 'mercantil'));
    expect(roundTrip.metadata.name).toBe('Asunto original');
    expect(roundTrip.documents[0]).toMatchObject({ fileName: 'anexo.pdf', base64: 'pdf-bytes' });
    expect(roundTrip.analyses).toEqual([{ id: 'analysis_1', summary: 'Original' }]);
    expect(roundTrip.drafts).toEqual([{ id: 'draft_1', generatedDoc: 'Texto' }]);
    expect(roundTrip.state.note).toBe('estado');
    expect(roundTrip.recordKeys).toEqual({ analyses: ['analysis_1'], drafts: ['draft_1'] });

    await vault.saveAnalysis('case_backup', 'analysis_1', { id: 'analysis_1', summary: 'Cambiado' }, 'mercantil');
    await expect(vault.restoreVaultBackup(opened)).rejects.toBeInstanceOf(vault.VaultRestoreConflict);
    expect(JSON.parse(await vault.exportCase('case_backup', 'mercantil')).analyses[0].summary).toBe('Cambiado');
    expect((await vault.restoreVaultBackup(opened, 'replace')).replaced).toBe(1);
    expect(JSON.parse(await vault.exportCase('case_backup', 'mercantil')).analyses[0].summary).toBe('Original');

    const damaged = openBackup([
      {
        metadata: {
          caseId: 'case_new',
          name: 'Nuevo',
          module: 'fiscal',
          createdAt: '2026-02-01T00:00:00.000Z',
          updatedAt: '2026-02-01T00:00:00.000Z',
          retentionUntil: null,
        },
        documents: [],
        analyses: [],
        drafts: [],
        state: null,
        recordKeys: { analyses: [], drafts: [] },
      },
      {
        metadata: {
          caseId: 'case_bad',
          name: 'Mal',
          module: 'no-existe',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        documents: [],
        analyses: [],
        drafts: [],
        recordKeys: { analyses: [], drafts: [] },
      },
    ]);
    await expect(vault.restoreVaultBackup(damaged)).rejects.toThrow('dañado');
    expect((await vault.listCases()).map(item => item.caseId).sort()).toEqual(['case_backup', 'case_keep']);
  });
});

function readVaultFiles(): string {
  const dir = path.join(mockState.testVaultPath, 'CaseVault');
  return fs.readdirSync(dir)
    .map(name => fs.readFileSync(path.join(dir, name)))
    .map(buf => buf.toString('latin1'))
    .join('\n');
}

function openBackup(cases: unknown[]) {
  return openPortableBackup(sealPortableBackup({
    format: 'lex-corporativo-vault-backup',
    formatVersion: 1,
    exportedAt: '2026-10-17T00:00:00.000Z',
    caseCount: cases.length,
    cases,
  }, 'frase-larga-1'), 'frase-larga-1');
}
