import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const profile = process.env.LEX_DATA_AUDIT_PROFILE!;
app.setPath('userData', profile);
(app as typeof app & { setAppPath(value: string): void }).setAppPath(process.cwd());
function containsText(directory: string, marker: string): boolean {
  if (!fs.existsSync(directory)) return false;
  return fs.readdirSync(directory, { withFileTypes: true }).some(entry => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? containsText(absolute, marker) : entry.isFile() && fs.readFileSync(absolute).includes(Buffer.from(marker));
  });
}
function errorMessage(fn: () => unknown): string | null {
  try { fn(); return null; } catch (error) { return error instanceof Error ? error.message : String(error); }
}
async function main() {
  await app.whenReady();
  const vault = await import('../../src/main/lib/case-vault');
  const rag = await import('../../src/main/lib/rag');
  const backup = await import('../../src/main/lib/portable-backup');
  const { sanitizeForLogs } = await import('../../src/main/lib/sanitizer');
  const lancedb = await import('@lancedb/lancedb');
  const name = 'SYNTHETIC_CONFIDENTIAL_CASE_NAME';
  const document = 'SYNTHETIC_PRIVATE_DOCUMENT_CONTENT';
  const fileMarker = 'SYNTHETIC_PRIVATE_FILE_NAME';
  const fileName = `${fileMarker}.txt`;
  const chunk = 'SYNTHETIC_PRIVATE_VECTOR_CONTENT';
  const password = 'contrasena-sintetica-auditoria';

  // Bóveda: payload, metadatos y nombres de archivo.
  await vault.createCase('audit_case', name, 'fiscal');
  await vault.saveDraft('audit_case', 'audit_draft', { document }, 'fiscal');
  await vault.saveDocument('audit_case', fileName, 'text/plain', Buffer.from('SYNTHETIC_FILE_BODY').toString('base64'), 'fiscal');
  const exported = JSON.parse(await vault.exportCase('audit_case', 'fiscal'));
  assert.equal(exported.drafts[0].document, document);
  assert.equal(exported.documents[0].fileName, fileName);
  const vaultDirectory = path.join(profile, 'CaseVault');
  const vaultPayloadEncrypted = !containsText(vaultDirectory, document);
  const vaultMetadataPlaintext = containsText(vaultDirectory, name);
  const fileNamePlaintext = containsText(vaultDirectory, fileMarker);

  // Respaldo portátil: mismo núcleo que construye vault:export-all.
  const core = { format: 'lex-corporativo-vault-backup' as const, formatVersion: 1 as const, exportedAt: new Date().toISOString(), caseCount: 1, cases: [exported] };
  const sealed = backup.sealPortableBackup(core, password);
  const backupPlaintext = [name, document, fileMarker].some(marker => sealed.includes(marker));
  const wrongPasswordRejected = errorMessage(() => backup.openPortableBackup(sealed, 'otra-clave-equivocada')) === 'La contraseña no abre este respaldo.';
  const truncatedRejected = errorMessage(() => backup.openPortableBackup(sealed.slice(0, -40), password)) === backup.DAMAGED_BACKUP;
  const cleartextRejected = errorMessage(() => backup.openPortableBackup(JSON.stringify(core), password)) === 'Este archivo es un respaldo sin cifrar y no se puede restaurar.';
  const opened = backup.openPortableBackup(sealed, password);
  await vault.deleteAllCases();
  const firstRestore = await vault.restoreVaultBackup(opened);
  const repeatedRestore = await vault.restoreVaultBackup(opened);
  const restored = JSON.parse(await vault.exportCase('audit_case', 'fiscal'));
  const restoreRoundTrip = firstRestore.restored === 1 && repeatedRestore.skipped === 1
    && restored.drafts[0].document === document && restored.documents[0].fileName === fileName && restored.metadata.name === name;
  await vault.saveDraft('audit_case', 'audit_draft', { document: `${document}_MODIFICADO` }, 'fiscal');
  let conflictDetected = false;
  try { await vault.restoreVaultBackup(opened, 'abort'); } catch (error) { conflictDetected = error instanceof vault.VaultRestoreConflict; }
  const replaceRestore = await vault.restoreVaultBackup(opened, 'replace');
  const conflictReplaced = replaceRestore.replaced === 1 && JSON.parse(await vault.exportCase('audit_case', 'fiscal')).drafts[0].document === document;

  // Fragmentos temporales en LanceDB.
  await rag.indexUserDocument({ requestId: 'data-audit', fileName: 'sintetico.txt', module: 'fiscal', contentHash: 'synthetic', chunks: [{ text: chunk, chunkIndex: 0, pageNumber: 1 }] });
  await rag.cleanupUserDocumentRequest('data-audit');
  const db = await lancedb.connect(path.join(profile, 'lance_data'));
  const table = await db.openTable('user_documents');
  const logicalRowsAfterDeletion = await table.countRows();
  table.close();
  db.close();
  const plaintextVectorRemains = containsText(path.join(profile, 'lance_data/user_documents.lance'), chunk);

  // Sanitizador de bitácoras.
  const redacted = sanitizeForLogs({ token: 'fixture-short', authorization: 'Bearer fixture-secret', message: 'token=fixture-secret' });
  const sanitizer = { shortTokenRedacted: redacted.token !== 'fixture-short', authorizationRedacted: !redacted.authorization.includes('fixture-secret'), messageSecretRedacted: !redacted.message.includes('fixture-secret') };

  const checks = [
    { id: 'VAULT-PAYLOAD', label: 'Contenido de la bóveda cifrado en reposo', ok: vaultPayloadEncrypted },
    { id: 'DATA-01', label: 'Respaldo cifrado con contraseña, restaurable, sin duplicados y con conflictos detectados', ok: !backupPlaintext && wrongPasswordRejected && truncatedRejected && cleartextRejected && restoreRoundTrip && conflictDetected && conflictReplaced },
    { id: 'DATA-02', label: 'Sin texto legible en LanceDB tras eliminar los fragmentos', ok: logicalRowsAfterDeletion === 0 && !plaintextVectorRemains },
    { id: 'DATA-03', label: 'Nombre del asunto y de los archivos cifrados', ok: !vaultMetadataPlaintext && !fileNamePlaintext },
    { id: 'SEC-03', label: 'Secretos redactados en bitácoras sin depender de la longitud', ok: Object.values(sanitizer).every(Boolean) },
  ];
  const report = {
    syntheticOnly: true,
    vaultPayloadEncrypted,
    vaultMetadataPlaintext,
    fileNamePlaintext,
    exportCaseJsonPlaintext: exported.drafts[0].document === document,
    portableBackup: { sealedContainsPlaintext: backupPlaintext, wrongPasswordRejected, truncatedRejected, cleartextRejected, firstRestore, repeatedRestore, restoreRoundTrip, conflictDetected, replaceRestore, conflictReplaced },
    logicalRowsAfterDeletion,
    plaintextVectorRemainsAfterLogicalDeletion: plaintextVectorRemains,
    sanitizer,
    checks,
    status: checks.every(check => check.ok) ? 'pass' : 'findings-open',
    limits: [
      'Sólo fixtures sintéticos y un perfil temporal; no se inspeccionó el perfil real.',
      'La ausencia de texto literal no acredita borrado forense del disco.',
      'exportCase es el JSON interno de un asunto y va en claro por diseño; el respaldo que recibe la persona usuaria es el sellado.',
      'La restauración se ensaya en el mismo perfil; la portabilidad entre usuarios de Windows se valida manualmente en el piloto.',
    ],
  };
  fs.writeFileSync(process.env.LEX_DATA_AUDIT_RESULT!, JSON.stringify(report, null, 2) + '\n');
  vault.closeDb();
}
void main().then(() => app.exit(0)).catch(error => { console.error(error); app.exit(1); });
