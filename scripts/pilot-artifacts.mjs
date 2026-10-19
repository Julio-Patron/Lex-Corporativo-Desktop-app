import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { hashFile, verifyResourceTree } from './release-artifacts.mjs';
import { verifyEmbeddings } from './download-embeddings.mjs';

// Manifiesto de un instalador de piloto interno SIN firma. No sustituye a release-artifacts.mjs,
// que exige firma Authenticode, SHA de GitHub y repositorio de distribución confirmado.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const release = path.join(root, 'release');
const allowDirty = process.argv.includes('--allow-dirty');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const installerName = `Lex-Corporativo-Setup-${pkg.version}.exe`;
const forbidden = /(^|\/)(\.env|byok-settings\.json|CaseVault|draft-recovery\.bin|trace_ledger|reports|scratch|screens-electron|docs\/auditorias)(\/|$)|\.(pem|pfx|p12)$/i;
const checks = [];
const check = (id, ok, detail) => { checks.push({ id, ok, detail }); if (!ok) console.error(`[piloto] ${id}: ${detail}`); };

const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
check('arbol-limpio', !dirty || allowDirty, dirty ? `Cambios sin confirmar:\n${dirty}` : 'Checkout limpio');

const installerPath = path.join(release, installerName);
check('instalador', fs.existsSync(installerPath), fs.existsSync(installerPath) ? installerName : `Falta release/${installerName}; ejecuta npm run build:electron`);
for (const name of [`${installerName}.blockmap`, 'latest.yml']) check(`artefacto:${name}`, fs.existsSync(path.join(release, name)), name);

let packagedResources = null;
let embeddings = null;
try {
  const packagedRoot = path.join(release, 'win-unpacked/resources/legal-runtime');
  embeddings = verifyEmbeddings(path.join(packagedRoot, 'models', 'Xenova/all-MiniLM-L6-v2'));
  packagedResources = {
    corpus: verifyResourceTree(path.join(root, 'legal-runtime/corpus'), path.join(packagedRoot, 'corpus'), file => file.endsWith('.md')).length,
    vectors: verifyResourceTree(path.join(root, 'legal-runtime/lance_data'), path.join(packagedRoot, 'lance_data')).length,
    embeddings: verifyResourceTree(path.join(root, 'legal-runtime/models', embeddings.model), path.join(packagedRoot, 'models', embeddings.model), file => embeddings.files.some(entry => entry.path === file)).length,
  };
  for (const [source, packaged] of [['legal-runtime/embeddings.lock.json', 'embeddings.lock.json'], ['legal-runtime/corpus/corpus-manifest.json', 'corpus-manifest.json']]) {
    if (hashFile(path.join(root, source)) !== hashFile(path.join(packagedRoot, packaged))) throw new Error(`Recurso empaquetado distinto: ${source}`);
  }
  check('recursos-empaquetados', true, `corpus ${packagedResources.corpus} archivos, vectores ${packagedResources.vectors}, modelo ${packagedResources.embeddings}`);
  check('avisos-terceros', fs.existsSync(path.join(release, 'win-unpacked/resources/THIRD-PARTY-NOTICES.txt')), 'THIRD-PARTY-NOTICES.txt');
} catch (error) {
  check('recursos-empaquetados', false, error.message);
}

let asarForbidden = [];
try {
  const asar = await import('@electron/asar');
  const entries = asar.listPackage(path.join(release, 'win-unpacked/resources/app.asar')).map(entry => entry.replaceAll('\\', '/'));
  asarForbidden = entries.filter(entry => forbidden.test(entry));
  check('contenido-asar', asarForbidden.length === 0, asarForbidden.length ? `Rutas prohibidas: ${asarForbidden.join(', ')}` : `${entries.length} entradas sin rutas prohibidas`);
} catch (error) {
  check('contenido-asar', false, `No se pudo listar app.asar: ${error.message}`);
}

let signature = { status: 'unknown' };
if (process.platform === 'win32' && fs.existsSync(installerPath)) {
  try {
    const raw = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', `(Get-AuthenticodeSignature -LiteralPath '${installerPath.replaceAll("'", "''")}') | Select-Object Status, @{n='Thumbprint';e={$_.SignerCertificate.Thumbprint}} | ConvertTo-Json -Compress`], { encoding: 'utf8' });
    const parsed = JSON.parse(raw);
    signature = { status: typeof parsed.Status === 'number' ? ({ 0: 'Valid', 1: 'UnknownError', 2: 'NotSigned', 3: 'HashMismatch', 4: 'NotTrusted', 5: 'NotSupportedFileFormat', 6: 'Incompatible' })[parsed.Status] ?? String(parsed.Status) : String(parsed.Status), thumbprint: parsed.Thumbprint || null };
  } catch (error) {
    signature = { status: 'error', detail: error.message };
  }
}
check('firma-registrada', signature.status !== 'error', `Authenticode: ${signature.status}`);

const tools = Object.fromEntries(['electron', 'electron-builder', '@electron/rebuild', '@xenova/transformers', '@lancedb/lancedb', 'better-sqlite3'].map(name => [name, JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8')).version]));
const installer = fs.existsSync(installerPath) ? { path: installerName, bytes: fs.statSync(installerPath).size, sha256: hashFile(installerPath) } : null;
const manifest = {
  schemaVersion: 1,
  kind: 'pilot-unsigned',
  version: pkg.version,
  sourceSha,
  workingTreeDirty: Boolean(dirty),
  generatedAt: new Date().toISOString(),
  signed: signature.status === 'Valid',
  signature,
  installer,
  build: { node: process.version, platform: process.platform, arch: process.arch, os: os.release(), tools },
  inputs: { lockfileSha256: hashFile(path.join(root, 'package-lock.json')), corpusManifestSha256: hashFile(path.join(root, 'legal-runtime/corpus/corpus-manifest.json')), embeddingsLockSha256: hashFile(path.join(root, 'legal-runtime/embeddings.lock.json')), embeddingsModel: embeddings?.model ?? null, packagedResources },
  checks,
  status: checks.every(item => item.ok) ? 'pass' : 'fail',
};
fs.mkdirSync(release, { recursive: true });
fs.writeFileSync(path.join(release, 'pilot-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const markdown = [
  `| Campo | Valor |`,
  `| --- | --- |`,
  `| Versión | ${pkg.version} |`,
  `| Commit de origen | \`${sourceSha}\` |`,
  `| Instalador | \`${installer?.path ?? 'no generado'}\` |`,
  `| SHA-256 | \`${installer?.sha256 ?? '—'}\` |`,
  `| Tamaño | ${installer ? `${(installer.bytes / 1024 / 1024).toFixed(1)} MB (${installer.bytes} bytes)` : '—'} |`,
  `| Firma Authenticode | ${signature.status}${manifest.signed ? '' : ' (build interno sin firma; SmartScreen mostrará advertencia)'} |`,
  `| Fecha de construcción | ${manifest.generatedAt} |`,
  `| Node / Electron / electron-builder | ${process.version} / ${tools.electron} / ${tools['electron-builder']} |`,
  `| Verificación | ${manifest.status} (${checks.filter(item => item.ok).length}/${checks.length} comprobaciones) |`,
].join('\n');
console.log(markdown);
console.log(`\n[piloto] manifiesto escrito en release/pilot-manifest.json (${manifest.status})`);
if (manifest.status !== 'pass') process.exitCode = 1;
