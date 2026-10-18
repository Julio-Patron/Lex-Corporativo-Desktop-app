import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyEmbeddings } from './download-embeddings.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const hashFile = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const allowedArtifact = name => /^Lex-Corporativo-Setup-[0-9A-Za-z.+-]+\.exe(?:\.blockmap)?$/.test(name) || /^(latest|alpha|beta|rc)\.yml$/.test(name) || name === 'signatures.json';

function listResourceFiles(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink()) throw new Error('Recurso enlazado no admitido');
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listResourceFiles(path.join(directory, entry.name), relative) : [relative];
  }).sort();
}

export function verifyResourceTree(source, packaged, include = () => true) {
  const expected = listResourceFiles(source).filter(include);
  const actual = listResourceFiles(packaged);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('Inventario de recursos empaquetados distinto');
  return expected.map(file => {
    const sha256 = hashFile(path.join(source, file));
    if (hashFile(path.join(packaged, file)) !== sha256) throw new Error(`Recurso empaquetado alterado: ${file}`);
    return { path: file, sha256, bytes: fs.statSync(path.join(packaged, file)).size };
  });
}

export function verifyCandidate(directory, { manifestHash, sourceSha, repository, version } = {}) {
  const manifestPath = path.join(directory, 'candidate-manifest.json');
  if (!/^[a-f0-9]{64}$/i.test(manifestHash || '') || hashFile(manifestPath) !== manifestHash.toLowerCase()) throw new Error('Hash del manifiesto distinto del aceptado');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.artifacts) || !manifest.artifacts.length) throw new Error('Manifiesto inválido');
  if (manifest.sourceSha !== sourceSha || manifest.repository !== repository || manifest.version !== version) throw new Error('SHA, repositorio o versión distintos de los aceptados');
  const names = new Set();
  for (const file of manifest.artifacts) {
    if (!allowedArtifact(file.path) || names.has(file.path)) throw new Error('Ruta de artefacto inválida o duplicada');
    names.add(file.path);
    const absolute = path.join(directory, file.path);
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.size !== file.bytes || hashFile(absolute) !== file.sha256) throw new Error(`Artefacto alterado: ${file.path}`);
  }
  const installer = `Lex-Corporativo-Setup-${version}.exe`;
  if (!names.has(installer) || !names.has(`${installer}.blockmap`) || !names.has('signatures.json') || ![...names].some(name => /^(latest|alpha|beta|rc)\.yml$/.test(name))) throw new Error('Candidato incompleto');
  const actual = fs.readdirSync(directory).sort();
  const expected = [...names, 'candidate-manifest.json'].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Archivos no declarados en el candidato');
  return manifest;
}

function createCandidate() {
  const release = path.join(root, 'release');
  const destination = path.join(release, 'candidate');
  if (fs.existsSync(destination)) throw new Error('El directorio del candidato ya existe; usa una construcción limpia');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const config = JSON.parse(fs.readFileSync(path.join(root, 'electron-builder.config.json'), 'utf8'));
  const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: root, encoding: 'utf8' }).trim();
  if (dirty) throw new Error('El candidato requiere un checkout limpio');
  if (process.env.GITHUB_SHA !== sourceSha) throw new Error('El SHA de construcción no coincide');
  const repository = `${config.publish.owner}/${config.publish.repo}`;
  if (process.env.DISTRIBUTION_REPOSITORY !== repository || process.env.GITHUB_REPOSITORY !== repository) throw new Error('Destino de distribución sin confirmar');
  const signatures = JSON.parse(fs.readFileSync(path.join(release, 'signatures.json'), 'utf8'));
  for (const file of [`Lex-Corporativo-Setup-${pkg.version}.exe`, 'win-unpacked/Lex Corporativo.exe']) {
    const signature = signatures.files?.find(item => item.file === file);
    if (signatures.status !== 'pass' || signature?.status !== 'Valid' || !signature.timestamped || signature.thumbprint !== process.env.WINDOWS_CERTIFICATE_SHA1?.toLowerCase() || signature.sha256 !== hashFile(path.join(release, file))) throw new Error(`Firma no acreditada: ${file}`);
  }
  const embeddings = verifyEmbeddings(path.join(release, 'win-unpacked/resources/legal-runtime/models', 'Xenova/all-MiniLM-L6-v2'));
  const packagedRoot = path.join(release, 'win-unpacked/resources/legal-runtime');
  const packagedResources = {
    corpus: verifyResourceTree(path.join(root, 'legal-runtime/corpus'), path.join(packagedRoot, 'corpus'), file => file.endsWith('.md')),
    vectors: verifyResourceTree(path.join(root, 'legal-runtime/lance_data'), path.join(packagedRoot, 'lance_data')),
    embeddings: verifyResourceTree(path.join(root, 'legal-runtime/models', embeddings.model), path.join(packagedRoot, 'models', embeddings.model), file => embeddings.files.some(entry => entry.path === file)),
  };
  for (const [source, packaged] of [['legal-runtime/embeddings.lock.json', 'embeddings.lock.json'], ['legal-runtime/corpus/corpus-manifest.json', 'corpus-manifest.json']]) {
    if (hashFile(path.join(root, source)) !== hashFile(path.join(release, 'win-unpacked/resources/legal-runtime', packaged))) throw new Error(`Recurso empaquetado distinto: ${source}`);
  }
  const artifacts = fs.readdirSync(release).filter(allowedArtifact).sort().map(name => ({ path: name, bytes: fs.statSync(path.join(release, name)).size, sha256: hashFile(path.join(release, name)) }));
  const tools = Object.fromEntries(['electron', 'electron-builder', '@electron/rebuild', '@xenova/transformers', '@lancedb/lancedb'].map(name => [name, JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8')).version]));
  const manifest = {
    schemaVersion: 1, sourceSha, repository, version: pkg.version,
    workflowRunId: process.env.GITHUB_RUN_ID, workflowRunAttempt: process.env.GITHUB_RUN_ATTEMPT,
    build: { node: process.version, npm: process.env.npm_config_user_agent || process.env.BUILD_NPM_VERSION, platform: process.platform, arch: process.arch, os: os.release(), runnerImage: process.env.ImageVersion || null, tools },
    inputs: { lockfileSha256: hashFile(path.join(root, 'package-lock.json')), corpusManifestSha256: hashFile(path.join(root, 'legal-runtime/corpus/corpus-manifest.json')), embeddings, packagedResources },
    artifacts,
  };
  fs.mkdirSync(destination);
  for (const file of artifacts) fs.copyFileSync(path.join(release, file.path), path.join(destination, file.path));
  const manifestPath = path.join(destination, 'candidate-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  const manifestHash = hashFile(manifestPath);
  verifyCandidate(destination, { manifestHash, sourceSha, repository, version: pkg.version });
  console.log(JSON.stringify({ sourceSha, version: pkg.version, manifestSha256: manifestHash, artifacts }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv[2] === 'create') createCandidate();
    else if (process.argv[2] === 'verify') {
      const manifest = verifyCandidate(path.resolve(process.argv[3]), {
        manifestHash: process.env.ACCEPTED_MANIFEST_SHA256, sourceSha: process.env.ACCEPTED_SOURCE_SHA,
        repository: process.env.DISTRIBUTION_REPOSITORY, version: process.env.RELEASE_TAG?.replace(/^v/, ''),
      });
      console.log(JSON.stringify({ status: 'pass', sourceSha: manifest.sourceSha, artifacts: manifest.artifacts.length }));
    } else throw new Error('Uso: release-artifacts.mjs create | verify <directorio>');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
