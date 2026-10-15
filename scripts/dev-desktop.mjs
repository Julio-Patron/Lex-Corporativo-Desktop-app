#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
let cliPath;

try {
  const packagePath = require.resolve('electron-vite/package.json');
  const manifest = JSON.parse(readFileSync(packagePath, 'utf8'));
  cliPath = resolve(dirname(packagePath), manifest.bin['electron-vite']);
} catch {
  console.error('Faltan las dependencias de desarrollo. Ejecuta npm ci desde la carpeta del proyecto.');
  process.exit(1);
}

const env = { ...process.env };
// Algunas terminales y editores heredan esta variable. Electron debe arrancar
// como aplicación de escritorio para poder mostrar su ventana.
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(process.execPath, [cliPath, 'dev', ...process.argv.slice(2)], {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
  windowsHide: true,
});

child.on('error', (error) => {
  console.error(`No se pudo abrir Lex Corporativo: ${error.message}`);
  process.exitCode = 1;
});

child.on('close', (code) => {
  process.exitCode = code ?? 1;
});
