import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as lancedb from '@lancedb/lancedb';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = path.join(repo, 'scratch');
fs.mkdirSync(scratch, { recursive: true });
const isolated = fs.mkdtempSync(path.join(scratch, 'legal-gates-'));
const checks = [];
function run(id, script, args, expected, diagnostic) {
  const result = spawnSync(process.execPath, [path.join(isolated, 'scripts', script), ...args], {
    cwd: isolated, encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(result.status, expected, `${id}: ${result.stderr}\n${result.stdout}`);
  if (diagnostic) assert.match(result.stdout + result.stderr, diagnostic, id);
  checks.push({ id, exitCode: result.status, status: 'pass' });
}
try {
  for (const relative of ['scripts', 'legal-runtime/corpus', 'legal-runtime/lance_data']) {
    fs.cpSync(path.join(repo, relative), path.join(isolated, relative), { recursive: true });
  }
  run('manifest-intacto', 'generate-corpus-manifest.mjs', ['--check', '--strict'], 0);
  run('conocimiento-intacto', 'audit-legal-knowledge.mjs', ['--strict'], 0);
  const manifestPath = path.join(isolated, 'legal-runtime/corpus/corpus-manifest.json');
  const original = fs.readFileSync(manifestPath);
  const altered = JSON.parse(original);
  altered.summary.corpusEntries += 1;
  fs.writeFileSync(manifestPath, JSON.stringify(altered));
  const tampered = fs.readFileSync(manifestPath);
  run('manifest-alterado', 'generate-corpus-manifest.mjs', ['--check', '--strict'], 1, /no coincide/);
  run('check-antes-de-write', 'generate-corpus-manifest.mjs', ['--check', '--write', '--strict'], 1, /no coincide/);
  assert.deepEqual(fs.readFileSync(manifestPath), tampered, 'El check fallido no repara su referencia');
  fs.writeFileSync(manifestPath, original);
  const db = await lancedb.connect(path.join(isolated, 'legal-runtime/lance_data'));
  const table = await db.openTable('legal_knowledge');
  await table.delete("law_code = 'CCom' AND article = 'Artículo 75'");
  run('ancla-juridica-ausente', 'audit-legal-knowledge.mjs', ['--strict'], 1, /Anclas legales criticas fallaron: CCom Artículo 75/);
  run('vectores-alterados', 'generate-corpus-manifest.mjs', ['--check', '--strict'], 1, /no coincide/);
  table.close();
  db.close();
  const output = path.join(repo, 'reports/audits/legal_gate_controls.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ status: 'pass', isolated: true, checks }, null, 2) + '\n');
  console.log(JSON.stringify(checks, null, 2));
} finally {
  if (path.dirname(isolated) !== scratch || !path.basename(isolated).startsWith('legal-gates-')) throw new Error('Ruta de ensayo inesperada');
  fs.rmSync(isolated, { recursive: true, force: true });
}
