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
async function main() {
  await app.whenReady();
  const vault = await import('../../src/main/lib/case-vault');
  const rag = await import('../../src/main/lib/rag');
  const { sanitizeForLogs } = await import('../../src/main/lib/sanitizer');
  const lancedb = await import('@lancedb/lancedb');
  const name = 'SYNTHETIC_CONFIDENTIAL_CASE_NAME';
  const document = 'SYNTHETIC_PRIVATE_DOCUMENT_CONTENT';
  const chunk = 'SYNTHETIC_PRIVATE_VECTOR_CONTENT';
  await vault.createCase('audit_case', name, 'fiscal');
  await vault.saveDraft('audit_case', 'audit_draft', { document }, 'fiscal');
  const exported = JSON.parse(await vault.exportCase('audit_case', 'fiscal'));
  assert.equal(exported.drafts[0].document, document);
  const vaultDirectory = path.join(profile, 'CaseVault');
  const encryptedPayload = !containsText(vaultDirectory, document);
  assert.equal(encryptedPayload, true);
  const metadataPlaintext = containsText(vaultDirectory, name);
  await rag.indexUserDocument({ requestId: 'data-audit', fileName: 'sintetico.txt', module: 'fiscal', contentHash: 'synthetic', chunks: [{ text: chunk, chunkIndex: 0, pageNumber: 1 }] });
  await rag.cleanupUserDocumentRequest('data-audit');
  const db = await lancedb.connect(path.join(profile, 'lance_data'));
  const table = await db.openTable('user_documents');
  const logicalRowsAfterDeletion = await table.countRows();
  assert.equal(logicalRowsAfterDeletion, 0);
  table.close();
  db.close();
  const plaintextVectorRemains = containsText(path.join(profile, 'lance_data/user_documents.lance'), chunk);
  const redacted = sanitizeForLogs({ token: 'fixture-short', authorization: 'Bearer fixture-secret', message: 'token=fixture-secret' });
  const report = {
    syntheticOnly: true,
    vaultPayloadEncrypted: encryptedPayload,
    vaultMetadataPlaintext: metadataPlaintext,
    exportedBackupPlaintext: exported.drafts[0].document === document,
    logicalRowsAfterDeletion,
    plaintextVectorRemainsAfterLogicalDeletion: plaintextVectorRemains,
    sanitizer: { shortTokenRedacted: redacted.token !== 'fixture-short', authorizationRedacted: !redacted.authorization.includes('fixture-secret'), messageSecretRedacted: !redacted.message.includes('fixture-secret') },
    status: 'findings-open',
    limits: ['Sólo fixtures sintéticos y un perfil temporal; no se inspeccionó el perfil real.', 'La ausencia de texto literal no acreditaría borrado físico seguro.', 'Exportar no prueba restauración ni portabilidad entre usuarios de Windows.'],
  };
  fs.writeFileSync(process.env.LEX_DATA_AUDIT_RESULT!, JSON.stringify(report, null, 2) + '\n');
  vault.closeDb();
}
void main().then(() => app.exit(0)).catch(error => { console.error(error); app.exit(1); });
