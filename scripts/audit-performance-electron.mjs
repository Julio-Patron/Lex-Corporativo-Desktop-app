import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import electron from 'electron';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = path.join(repo, 'scratch');
fs.mkdirSync(scratch, { recursive: true });
const temporary = fs.mkdtempSync(path.join(scratch, 'performance-'));
try {
  await Promise.all([
    build({ entryPoints: [path.join(repo, 'tests/performance-electron/main.ts')], outfile: path.join(temporary, 'main.cjs'), platform: 'node', format: 'cjs', bundle: true, packages: 'external' }),
    build({ entryPoints: [path.join(repo, 'tests/performance-electron/exports.ts')], outfile: path.join(temporary, 'exports.js'), platform: 'browser', format: 'iife', globalName: 'LexPerfExports', bundle: true, loader: { '.png': 'dataurl' } }),
  ]);
  const runs = [];
  for (let index = 0; index < 5; index++) {
    const profile = path.join(temporary, `profile-${index}`);
    fs.mkdirSync(profile);
    const resultFile = path.join(temporary, `result-${index}.json`);
    const env = { ...process.env, LEX_PERF_PROFILE: profile, LEX_PERF_RESULT: resultFile, LEX_PERF_EXPORTS: path.join(temporary, 'exports.js'), LEX_PERF_STARTED: String(Date.now()) };
    delete env.ELECTRON_RUN_AS_NODE;
    delete env.LEX_ENGINE_LANCE_PATH;
    delete env.LEX_EMBEDDING_MODEL_PATH;
    await new Promise((resolve, reject) => {
      const child = spawn(electron, [path.join(temporary, 'main.cjs')], { cwd: repo, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let log = '';
      child.stdout.on('data', data => { log += data; });
      child.stderr.on('data', data => { log += data; });
      const timer = setTimeout(() => child.kill(), 180_000);
      child.on('error', error => { clearTimeout(timer); reject(error); });
      child.on('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(log.slice(-6000))); });
    });
    runs.push(JSON.parse(fs.readFileSync(resultFile, 'utf8')));
    console.log(`[rendimiento] proceso ${index + 1}/5 terminado`);
  }
  const metrics = {};
  for (const key of Object.keys(runs[0].samples)) {
    const values = runs.flatMap(run => run.samples[key]).sort((a, b) => a - b);
    metrics[key] = { count: values.length, medianMs: values[Math.floor(values.length / 2)], p95Ms: values[Math.ceil(values.length * 0.95) - 1], minMs: values[0], maxMs: values.at(-1) };
  }
  const report = {
    sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), workingTreeDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' }).trim()),
    generatedAt: new Date().toISOString(), environment: { platform: process.platform, arch: process.arch, os: os.release(), cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, memoryBytes: os.totalmem(), electron: JSON.parse(fs.readFileSync(path.join(repo, 'node_modules/electron/package.json'), 'utf8')).version },
    corpus: JSON.parse(fs.readFileSync(path.join(repo, 'legal-runtime/corpus/corpus-manifest.json'), 'utf8')).artifactSha256,
    limitations: ['Ventana oculta y main de ensayo con handlers reales; no mide el main completo del producto instalado.', 'Cinco procesos y perfiles nuevos; caché del sistema operativo sin purgar. No equivale a arranque tras reiniciar Windows.', 'Recarga como aproximación de arranque caliente; lectura RMF sin renderizar el lector.', 'Revisión básica y documento sintético; sin proveedores ni credenciales reales.', 'Exportación con diálogo simulado; no incluye tiempo de elección del usuario.', 'Línea base descriptiva, sin umbrales de aceptación acordados.'],
    metrics, runs,
  };
  const output = path.join(repo, `reports/audits/performance-${report.sourceSha.slice(0, 7)}.json`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(metrics, null, 2));
} finally {
  if (path.dirname(temporary) !== scratch || !path.basename(temporary).startsWith('performance-')) throw new Error('Ruta temporal inesperada');
  fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}
