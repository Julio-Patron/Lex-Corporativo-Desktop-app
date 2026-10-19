#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

const logDir = resolve(projectRoot, 'logs');
const logFile = env.LEX_DEV_LOG_FILE ? resolve(env.LEX_DEV_LOG_FILE) : resolve(logDir, 'dev-desktop.log');
try {
  mkdirSync(dirname(logFile), { recursive: true });
  writeFileSync(logFile, `[${new Date().toISOString()}] [DEV-DESKTOP] Iniciando sesión de desarrollo (cwd=${projectRoot})\n`, 'utf8');
} catch {
  // Si el directorio de logs no es escribible, continúa sin interrumpir el arranque.
}

function writeLogChunk(streamLabel, chunk) {
  try {
    const text = chunk.toString('utf8');
    const lines = text.split(/\r?\n/);
    const timestamp = new Date().toISOString();
    const formatted = lines
      .map((line, index) => (index === lines.length - 1 && line === '' ? '' : `[${timestamp}] [${streamLabel}] ${line}\n`))
      .join('');
    if (formatted) appendFileSync(logFile, formatted, 'utf8');
  } catch {
    // Ignorar errores de escritura de bitácora de desarrollo.
  }
}

const child = spawn(process.execPath, [cliPath, 'dev', ...process.argv.slice(2)], {
  cwd: projectRoot,
  env,
  stdio: ['inherit', 'pipe', 'pipe'],
  windowsHide: true,
});

child.stdout?.on('data', (chunk) => {
  process.stdout.write(chunk);
  writeLogChunk('STDOUT', chunk);
});

child.stderr?.on('data', (chunk) => {
  process.stderr.write(chunk);
  writeLogChunk('STDERR', chunk);
});

child.on('error', (error) => {
  const msg = `No se pudo abrir Lex Corporativo: ${error.message}`;
  console.error(msg);
  writeLogChunk('ERROR', Buffer.from(`${msg}\n`, 'utf8'));
  process.exitCode = 1;
});

child.on('close', (code) => {
  writeLogChunk('EXIT', Buffer.from(`Proceso finalizado con código ${code ?? 1}\n`, 'utf8'));
  process.exitCode = code ?? 1;
});
