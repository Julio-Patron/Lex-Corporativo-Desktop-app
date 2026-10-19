import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Consolida la evidencia local (reports/) en un bundle sanitizado versionable en docs/auditorias/.
// Uso: node scripts/collect-audit-evidence.mjs <sha7> [fecha]
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shaArg = process.argv[2];
const date = process.argv[3] || new Date().toISOString().slice(0, 10);
if (!/^[0-9a-f]{7,40}$/i.test(shaArg || '')) throw new Error('Uso: collect-audit-evidence.mjs <sha> [fecha] [--supersedes=<sha>]');
// Los reportes de auditoría se nombran con los 7 primeros caracteres del SHA.
const sha7 = shaArg.slice(0, 7).toLowerCase();
const supersedesArg = process.argv.find(arg => arg.startsWith('--supersedes='))?.slice('--supersedes='.length);
// Por defecto se supersede el bundle versionado más reciente distinto del que se va a escribir.
const previousBundles = fs.readdirSync(path.join(root, 'docs/auditorias'))
  .filter(name => /^evidencia-.+\.json$/.test(name) && name !== `evidencia-${date}.json`)
  .sort();
const supersedes = supersedesArg || (previousBundles.length
  ? (JSON.parse(fs.readFileSync(path.join(root, 'docs/auditorias', previousBundles.at(-1)), 'utf8')).sourceSha ?? previousBundles.at(-1))
  : null);

function sanitize(text) {
  for (const prefix of [root, os.homedir()].sort((a, b) => b.length - a.length)) {
    for (const variant of [prefix.replaceAll('\\', '\\\\'), prefix.replaceAll('\\', '/'), prefix]) text = text.replaceAll(variant, '<workspace>');
  }
  return text.replace(/(Bearer\s+)[^\s"']+/gi, '$1<redacted>').replace(/\b(?:sk-|AIza)[A-Za-z0-9_-]{16,}/g, '<redacted>');
}
const readJson = (relative, { required = true } = {}) => {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) {
    if (required) throw new Error(`Falta el reporte requerido ${relative}; ejecuta la auditoría correspondiente sobre ${sha7} antes de consolidar.`);
    return { missing: relative };
  }
  const raw = fs.readFileSync(absolute, 'utf8');
  const start = raw.indexOf('{');
  if (start < 0) throw new Error(`${relative} no contiene JSON.`);
  return JSON.parse(sanitize(raw.slice(start)));
};
const summary = (report, keys) => report.missing ? report : Object.fromEntries(keys.filter(key => key in report).map(key => [key, report[key]]));

const performance = readJson(`reports/audits/performance-${sha7}.json`);
const data = readJson(`reports/audits/data-${sha7}.json`);
const security = readJson(`reports/audits/security-${sha7}.json`);
const cleanup = readJson(`reports/audits/cleanup-inventory-${sha7}.json`, { required: false });
const npmAudit = readJson(`reports/audits/npm-audit-${sha7}.json`);
const preflight = readJson(`reports/audits/preflight-${sha7}.json`);
const quality = readJson('reports/ci/quality/summary.json');
const windows = readJson('reports/ci/windows/summary.json');
const pilot = readJson('release/pilot-manifest.json', { required: false });
const coverage = readJson('reports/coverage/coverage-summary.json', { required: false });
for (const [name, report] of Object.entries({ quality, windows })) {
  if (!String(report.sourceSha || '').startsWith(sha7)) throw new Error(`El resumen de ci:${name} corresponde a ${String(report.sourceSha).slice(0, 7)}, no a ${sha7}; vuelve a ejecutar la suite.`);
}

const bundle = {
  schemaVersion: 1,
  date,
  sourceSha: sha7,
  supersedes,
  ci: {
    quality: summary(quality, ['status', 'sourceSha', 'workingTreeDirty', 'node', 'npm', 'platform', 'checks']),
    windows: summary(windows, ['status', 'sourceSha', 'workingTreeDirty', 'node', 'npm', 'platform', 'uiEvidenceId', 'checks']),
  },
  performance: summary(performance, ['sourceSha', 'workingTreeDirty', 'generatedAt', 'environment', 'thresholds', 'evaluation', 'status', 'metrics', 'limitations']),
  data: summary(data, ['sourceSha', 'workingTreeDirty', 'generatedAt', 'checks', 'status', 'portableBackup', 'sanitizer', 'logicalRowsAfterDeletion', 'plaintextVectorRemainsAfterLogicalDeletion', 'limits']),
  security: summary(security, ['sourceSha', 'workingTreeDirty', 'generatedAt', 'checks', 'status', 'ipc', 'csp', 'deepLink', 'limits']),
  cleanup: summary(cleanup, ['sourceSha', 'workingTreeDirty', 'deletedPaths', 'exactDuplicateTests', 'licenses']),
  dependencyAudit: npmAudit.missing ? npmAudit : { vulnerabilities: npmAudit.metadata?.vulnerabilities, packages: Object.values(npmAudit.vulnerabilities || {}).map(item => ({ name: item.name, severity: item.severity, direct: item.isDirect, fixIsMajor: Boolean(item.fixAvailable?.isSemVerMajor) })).sort((a, b) => a.name.localeCompare(b.name)) },
  preflight: summary(preflight, ['status', 'target', 'strict', 'checks']),
  coverage: coverage.missing ? coverage : { total: coverage.total },
  pilotInstaller: summary(pilot, ['version', 'sourceSha', 'buildSha', 'signed', 'signature', 'installer', 'build', 'inputs', 'checks', 'status']),
  generatedAt: new Date().toISOString(),
  git: { head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()) },
};
const output = path.join(root, 'docs/auditorias', `evidencia-${date}.json`);
fs.writeFileSync(output, sanitize(JSON.stringify(bundle, null, 2)) + '\n');
console.log(JSON.stringify({ output: path.relative(root, output), quality: bundle.ci.quality.status, windows: bundle.ci.windows.status, performance: bundle.performance.status, data: bundle.data.status, security: bundle.security.status, preflight: bundle.preflight.status, installer: bundle.pilotInstaller.status }, null, 2));
