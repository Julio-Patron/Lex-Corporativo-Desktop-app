import { build } from 'esbuild';
import electron from 'electron';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = path.join(repo, 'scratch');
mkdirSync(scratch, { recursive: true });
const root = mkdtempSync(path.join(scratch, 'ui-test-'));
try {
  await build({ entryPoints: [path.join(repo, 'tests/ui-electron/main.ts')], outfile: path.join(root, 'main.cjs'), bundle: true, platform: 'node', format: 'cjs', packages: 'external' });
  const env = { ...process.env, LEX_UI_TEST_ROOT: root };
  delete env.ELECTRON_RUN_AS_NODE;
  await new Promise((resolve, reject) => {
    const child = spawn(electron, [path.join(root, 'main.cjs')], { cwd: repo, env, stdio: 'inherit', windowsHide: true });
    const timer = setTimeout(() => { child.kill(); }, 240_000);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('exit', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`Recorrido visual: código ${code}`)); });
  });
} finally {
  // Sólo se retira el perfil sintético creado por esta ejecución. Las capturas
  // y el informe permanecen en reports/ux-ui/.
  if (path.dirname(root) !== scratch || !path.basename(root).startsWith('ui-test-')) throw new Error('Ruta temporal inesperada');
  rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}
