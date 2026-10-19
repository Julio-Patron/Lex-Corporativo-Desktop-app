import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import electron from 'electron';

// Ensayo de seguridad en Electron: frontera IPC, CSP efectiva y deep link. Requiere npm run build previo.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = path.join(repo, 'scratch');
fs.mkdirSync(scratch, { recursive: true });
const temporary = fs.mkdtempSync(path.join(scratch, 'security-'));
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const reportPath = path.join(repo, `reports/audits/security-${sourceSha.slice(0, 7)}.json`);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
try {
  if (!fs.existsSync(path.join(repo, 'out/preload/index.cjs')) || !fs.existsSync(path.join(repo, 'out/renderer/index.html'))) {
    throw new Error('Falta out/: ejecuta npm run build antes de npm run audit:security:electron.');
  }
  const profile = path.join(temporary, 'profile');
  fs.mkdirSync(profile);
  await build({ entryPoints: [path.join(repo, 'tests/security-electron/main.ts')], outfile: path.join(temporary, 'main.cjs'), bundle: true, platform: 'node', format: 'cjs', packages: 'external' });
  const env = { ...process.env, LEX_SECURITY_PROFILE: profile, LEX_SECURITY_RESULT: path.join(temporary, 'result.json') };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.LEX_ENGINE_LANCE_PATH;
  delete env.LEX_EMBEDDING_MODEL_PATH;
  await new Promise((resolve, reject) => {
    const child = spawn(electron, [path.join(temporary, 'main.cjs')], { cwd: repo, env, windowsHide: true, stdio: 'inherit' });
    const timer = setTimeout(() => child.kill(), 120_000);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`Ensayo de seguridad: ${code}`)); });
  });
  const report = { sourceSha, workingTreeDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' }).trim()), generatedAt: new Date().toISOString(), ...JSON.parse(fs.readFileSync(path.join(temporary, 'result.json'), 'utf8')) };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'pass' && !process.argv.includes('--report-only')) process.exitCode = 1;
} finally {
  if (path.dirname(temporary) !== scratch || !path.basename(temporary).startsWith('security-')) throw new Error('Ruta temporal inesperada');
  fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}
