import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
const suites = {
  quality: ['audit:corpus-governance:strict', 'verify:embeddings', 'lint', 'test', 'test:release-controls', 'build', 'audit:legal-knowledge:strict', 'audit:legal-retrieval', 'eval:legal-rag', 'test:legal-gates', 'audit:corpus-governance:strict'],
  windows: ['audit:corpus-governance:strict', 'verify:embeddings', 'test', 'predev:electron', 'build', 'test:vault:electron', 'test:recovery:electron', 'test:ui:electron'],
};
if (!suites[mode] || !process.env.npm_execpath) throw new Error('Usa npm run ci:quality o npm run ci:windows');
const output = path.join(root, 'reports/ci', mode);
fs.mkdirSync(output, { recursive: true });
function sanitize(text) {
  for (const prefix of [root, os.homedir()].sort((a, b) => b.length - a.length)) {
    for (const variant of [prefix.replaceAll('\\', '\\\\'), prefix.replaceAll('\\', '/'), prefix]) text = text.replaceAll(variant, '<workspace>');
  }
  return text.replace(/(Bearer\s+)[^\s"']+/gi, '$1<redacted>').replace(/\b(?:sk-|AIza)[A-Za-z0-9_-]{16,}/g, '<redacted>');
}
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const state = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
const inputFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean).sort();
const inputDigest = crypto.createHash('sha256');
for (const file of inputFiles) {
  const absolute = path.join(root, file);
  if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) inputDigest.update(`${file}\0${crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex')}\n`);
}
const uiEvidenceId = `ci-${sha}-${process.env.GITHUB_RUN_ID || Date.now()}-${process.env.GITHUB_RUN_ATTEMPT || '1'}`;
const report = {
  sourceSha: sha, workingTreeDirty: Boolean(state), inputFilesSha256: inputDigest.digest('hex'), mode, status: 'running',
  uiEvidenceId: mode === 'windows' ? uiEvidenceId : undefined,
  node: process.version, npm: execFileSync(process.execPath, [process.env.npm_execpath, '--version'], { encoding: 'utf8' }).trim(),
  platform: process.platform, arch: process.arch, os: os.release(),
  lockfileSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'package-lock.json'))).digest('hex'),
  checks: [],
};
for (const [index, script] of suites[mode].entries()) {
  console.log(`[ci] ${script}`);
  const started = Date.now();
  const result = await new Promise(resolve => {
    const child = spawn(process.execPath, [process.env.npm_execpath, 'run', script], {
      cwd: root, env: { ...process.env, LEX_REQUIRE_NODE_SQLITE: '1', LEX_UI_EVIDENCE_ID: uiEvidenceId }, windowsHide: true,
    });
    let text = '';
    child.stdout.on('data', chunk => { text += chunk; });
    child.stderr.on('data', chunk => { text += chunk; });
    // Si el proceso no llega a arrancar no se emite 'close': resolver aquí evita que el paso cuelgue hasta el timeout.
    child.on('error', error => { text += error.message; resolve({ code: 1, text: sanitize(text) }); });
    child.on('close', code => resolve({ code, text: sanitize(text) }));
  });
  fs.writeFileSync(path.join(output, `${index}-${script.replaceAll(':', '-')}.log`), result.text);
  report.checks.push({ script, exitCode: result.code, durationMs: Date.now() - started });
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(result.text.slice(-2200));
  if (result.code !== 0) { report.status = 'fail'; process.exitCode = 1; break; }
}
if (report.status === 'running') report.status = 'pass';
// Lista cerrada: nunca subir reports/ completo, perfiles, respaldos ni corpus de usuarios.
const reportSources = { 'legal_knowledge_manifest.json': 'audit:legal-knowledge:strict', 'legal_retrieval_probe.json': 'audit:legal-retrieval', 'legal_rag_semantic_eval.json': 'eval:legal-rag', 'legal_gate_controls.json': 'test:legal-gates' };
for (const [name, script] of Object.entries(reportSources)) {
  const source = path.join(root, 'reports/audits', name);
  if (mode === 'quality' && report.checks.some(check => check.script === script && check.exitCode === 0) && fs.existsSync(source)) fs.writeFileSync(path.join(output, name), sanitize(fs.readFileSync(source, 'utf8')));
}
fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
