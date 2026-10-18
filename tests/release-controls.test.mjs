import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { embeddingLock, modelDirectory, prepareEmbeddings, verifyEmbeddings } from '../scripts/download-embeddings.mjs';
import { hashFile, verifyCandidate, verifyResourceTree } from '../scripts/release-artifacts.mjs';

function isolated(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lex-release-controls-'));
  t.after(() => {
    if (path.dirname(directory) !== os.tmpdir() || !path.basename(directory).startsWith('lex-release-controls-')) throw new Error('Ruta temporal inesperada');
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return directory;
}

test('construcción limpia usa únicamente revisión y hashes fijados', async t => {
  const directory = isolated(t);
  const urls = [];
  await prepareEmbeddings({ directory, fetchFile: async url => {
    urls.push(url);
    const prefix = `https://huggingface.co/${embeddingLock.model}/resolve/${embeddingLock.revision}/`;
    assert.ok(url.startsWith(prefix));
    return new Response(fs.readFileSync(path.join(modelDirectory, url.slice(prefix.length))));
  } });
  assert.equal(urls.length, 4);
  assert.deepEqual(verifyEmbeddings(directory), verifyEmbeddings());
  await prepareEmbeddings({ directory, fetchFile: () => { throw new Error('No debe consultar red con recursos íntegros'); } });
});

test('un tokenizador alterado se rechaza sin repararlo ni consultar red', async t => {
  const directory = isolated(t);
  fs.cpSync(modelDirectory, directory, { recursive: true });
  const tokenizer = path.join(directory, 'tokenizer.json');
  fs.appendFileSync(tokenizer, ' ');
  await assert.rejects(prepareEmbeddings({ directory, fetchFile: () => { throw new Error('Consulta no autorizada'); } }), /Integridad MiniLM incorrecta: tokenizer.json/);
  assert.equal(fs.statSync(tokenizer).size, embeddingLock.files.find(file => file.path === 'tokenizer.json').bytes + 1);
});

test('descarga corrupta no se incorpora y check no descarga faltantes', async t => {
  const directory = isolated(t);
  await assert.rejects(prepareEmbeddings({ directory, fetchFile: async () => new Response('corrupto') }), /Integridad MiniLM/);
  assert.deepEqual(fs.readdirSync(directory), []);
  await assert.rejects(prepareEmbeddings({ directory, checkOnly: true }), /Falta recurso/);
});

function candidateFixture(t) {
  const directory = isolated(t);
  const version = '1.0.0-rc.16';
  const artifacts = [`Lex-Corporativo-Setup-${version}.exe`, `Lex-Corporativo-Setup-${version}.exe.blockmap`, 'rc.yml', 'signatures.json'].map(name => {
    fs.writeFileSync(path.join(directory, name), `fixture:${name}`);
    return { path: name, bytes: fs.statSync(path.join(directory, name)).size, sha256: hashFile(path.join(directory, name)) };
  });
  const manifest = { schemaVersion: 1, version, sourceSha: 'a'.repeat(40), repository: 'test/repo', artifacts };
  const manifestPath = path.join(directory, 'candidate-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  return { directory, manifest, manifestPath, options: { version, sourceSha: manifest.sourceSha, repository: manifest.repository, manifestHash: hashFile(manifestPath) } };
}

test('promoción verifica bytes del candidato y vincula SHA, versión y repositorio', t => {
  const { directory, options } = candidateFixture(t);
  assert.equal(verifyCandidate(directory, options).sourceSha, options.sourceSha);
  for (const key of ['sourceSha', 'version', 'repository']) assert.throws(() => verifyCandidate(directory, { ...options, [key]: 'incorrecto' }), /distintos/);
  fs.appendFileSync(path.join(directory, 'rc.yml'), 'alterado');
  assert.throws(() => verifyCandidate(directory, options), /Artefacto alterado/);
});

test('manifiesto sustituido no acredita aceptación aunque recalcule sus hashes', t => {
  const { directory, options, manifest, manifestPath } = candidateFixture(t);
  manifest.version = '2.0.0';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  assert.throws(() => verifyCandidate(directory, options), /Hash del manifiesto/);
});

test('rechaza archivos extra y rutas fuera del candidato', t => {
  const { directory, options, manifest, manifestPath } = candidateFixture(t);
  fs.writeFileSync(path.join(directory, 'private.json'), 'datos');
  assert.throws(() => verifyCandidate(directory, options), /no declarados/);
  fs.unlinkSync(path.join(directory, 'private.json'));
  manifest.artifacts[0].path = '../escape.exe';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  assert.throws(() => verifyCandidate(directory, { ...options, manifestHash: hashFile(manifestPath) }), /Ruta de artefacto/);
});

test('rechaza un candidato al que falta un archivo aceptado', t => {
  const { directory, options } = candidateFixture(t);
  fs.unlinkSync(path.join(directory, 'rc.yml'));
  assert.throws(() => verifyCandidate(directory, options), /ENOENT/);
});

test('comprueba contenido real del corpus empaquetado y rechaza extras', t => {
  const directory = isolated(t);
  const source = path.join(directory, 'source');
  const packaged = path.join(directory, 'packaged');
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(source, 'ley.md'), 'contenido normativo sintético');
  fs.cpSync(source, packaged, { recursive: true });
  assert.equal(verifyResourceTree(source, packaged).length, 1);
  fs.appendFileSync(path.join(packaged, 'ley.md'), 'alterado');
  assert.throws(() => verifyResourceTree(source, packaged), /Recurso empaquetado alterado/);
  fs.copyFileSync(path.join(source, 'ley.md'), path.join(packaged, 'ley.md'));
  fs.writeFileSync(path.join(packaged, 'perfil.json'), 'datos ajenos');
  assert.throws(() => verifyResourceTree(source, packaged), /Inventario de recursos/);
});
