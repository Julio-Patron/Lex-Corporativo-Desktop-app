import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let fixture: string;

beforeEach(() => {
  fixture = mkdtempSync(join(tmpdir(), 'lex-launcher-'));
  mkdirSync(join(fixture, 'scripts'));
  copyFileSync(fileURLToPath(new URL('../scripts/dev-desktop.mjs', import.meta.url)), join(fixture, 'scripts/dev-desktop.mjs'));
});

afterEach(() => {
  // Sólo elimina el directorio temporal creado por esta prueba.
  expect(dirname(resolve(fixture))).toBe(resolve(tmpdir()));
  expect(basename(fixture)).toMatch(/^lex-launcher-/);
  rmSync(fixture, { recursive: true, force: true });
});

function installFakeCli() {
  const packageRoot = join(fixture, 'node_modules/electron-vite');
  mkdirSync(packageRoot, { recursive: true });
  writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({ name: 'electron-vite', bin: { 'electron-vite': 'cli.cjs' } }));
  writeFileSync(join(packageRoot, 'cli.cjs'), `
    console.log(JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2), electronRunAsNode: process.env.ELECTRON_RUN_AS_NODE ?? null, preserved: process.env.LEX_LAUNCHER_TEST }));
    process.exit(Number(process.env.LEX_LAUNCHER_EXIT ?? 0));
  `);
}

function launch(args: string[] = [], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [join(fixture, 'scripts/dev-desktop.mjs'), ...args], {
    cwd: tmpdir(),
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 10_000,
    windowsHide: true,
  });
}

describe('lanzador de desarrollo de escritorio', () => {
  it('usa la carpeta del proyecto, conserva argumentos y permite que Electron abra una ventana', () => {
    installFakeCli();
    const result = launch(['--rendererOnly'], { ELECTRON_RUN_AS_NODE: '1', LEX_LAUNCHER_TEST: 'conservar' });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ cwd: fixture, args: ['dev', '--rendererOnly'], electronRunAsNode: null, preserved: 'conservar' });
  });

  it('comunica a npm el fallo del proceso de desarrollo', () => {
    installFakeCli();
    expect(launch([], { LEX_LAUNCHER_EXIT: '7' }).status).toBe(7);
  });

  it('explica cómo instalar las dependencias cuando no encuentra la herramienta', () => {
    const result = launch();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Ejecuta npm ci');
  });
});
