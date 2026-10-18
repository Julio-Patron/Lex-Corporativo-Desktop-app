import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const embeddingLock = JSON.parse(fs.readFileSync(path.join(root, 'legal-runtime/embeddings.lock.json'), 'utf8'));
export const modelDirectory = path.join(root, 'legal-runtime/models', embeddingLock.model);

export function verifyEmbeddingBytes(bytes, entry) {
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== entry.bytes || hash !== entry.sha256) throw new Error(`Integridad MiniLM incorrecta: ${entry.path}`);
}

export function verifyEmbeddings(directory = modelDirectory) {
  for (const entry of embeddingLock.files) verifyEmbeddingBytes(fs.readFileSync(path.join(directory, entry.path)), entry);
  return { model: embeddingLock.model, revision: embeddingLock.revision, files: embeddingLock.files };
}

export async function prepareEmbeddings({ directory = modelDirectory, checkOnly = false, fetchFile = fetch } = {}) {
  for (const entry of embeddingLock.files) {
    const destination = path.join(directory, entry.path);
    if (fs.existsSync(destination)) {
      // Un archivo alterado se rechaza; nunca se repara en silencio durante un gate.
      verifyEmbeddingBytes(fs.readFileSync(destination), entry);
      continue;
    }
    if (checkOnly) throw new Error(`Falta recurso MiniLM: ${entry.path}`);
    const url = `https://huggingface.co/${embeddingLock.model}/resolve/${embeddingLock.revision}/${entry.path}`;
    const response = await fetchFile(url, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`Descarga MiniLM: HTTP ${response.status} (${entry.path})`);
    const bytes = Buffer.from(await response.arrayBuffer());
    verifyEmbeddingBytes(bytes, entry);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, bytes, { flag: 'wx' });
      fs.renameSync(temporary, destination);
    } finally {
      fs.rmSync(temporary, { force: true });
    }
  }
  return verifyEmbeddings(directory);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = await prepareEmbeddings({ checkOnly: process.argv.includes('--check') });
    console.log(JSON.stringify({ status: 'pass', ...result }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
