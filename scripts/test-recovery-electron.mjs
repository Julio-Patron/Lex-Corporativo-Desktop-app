import { build } from 'esbuild';
import electron from 'electron';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = path.join(repo, 'scratch');
mkdirSync(scratch, { recursive: true });
const root = mkdtempSync(path.join(scratch, 'recovery-test-'));
try {
  await Promise.all([
    build({ entryPoints: [path.join(repo, 'tests/recovery-electron/main.ts')], outfile: path.join(root, 'main.cjs'), bundle: true, platform: 'node', format: 'cjs', external: ['electron', 'better-sqlite3'] }),
    build({ entryPoints: [path.join(repo, 'src/preload/index.ts')], outfile: path.join(root, 'preload.cjs'), bundle: true, platform: 'node', format: 'cjs', external: ['electron'] }),
    build({ entryPoints: [path.join(repo, 'tests/recovery-electron/renderer.ts')], outfile: path.join(root, 'renderer.js'), bundle: true, platform: 'browser', format: 'iife' }),
  ]);
  writeFileSync(path.join(root, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'"></head><body><script src="renderer.js"></script></body></html>');
  for (const phase of ['write', 'read']) {
    const env = { ...process.env, LEX_RECOVERY_TEST_ROOT: root, LEX_RECOVERY_TEST_PHASE: phase };
    delete env.ELECTRON_RUN_AS_NODE;
    await new Promise((resolve, reject) => {
      const child = spawn(electron, [path.join(root, 'main.cjs')], { env, cwd: repo, stdio: 'inherit', windowsHide: true });
      const timer = setTimeout(() => { child.kill(); reject(new Error(`Tiempo agotado: ${phase}`)); }, 45_000);
      child.on('error', error => { clearTimeout(timer); reject(error); });
      child.on('exit', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`Prueba ${phase}: código ${code}`)); });
    });
  }
} finally {
  // Sólo se elimina el directorio que acaba de crear esta prueba bajo scratch.
  if (path.dirname(root) !== scratch || !path.basename(root).startsWith('recovery-test-')) throw new Error('Ruta temporal inesperada');
  rmSync(root, { recursive: true, force: true });
}
