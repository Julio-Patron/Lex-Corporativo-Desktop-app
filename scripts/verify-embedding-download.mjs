import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareEmbeddings } from './download-embeddings.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = path.join(root, 'scratch');
fs.mkdirSync(scratch, { recursive: true });
const temporary = fs.mkdtempSync(path.join(scratch, 'embedding-download-'));
try {
  const result = await prepareEmbeddings({ directory: temporary });
  const report = { generatedAt: new Date().toISOString(), status: 'pass', emptyDestination: true, source: 'remote-pinned-revision', ...result };
  const reportPath = path.join(root, 'reports/audits/embedding-download.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (path.dirname(temporary) !== scratch || !path.basename(temporary).startsWith('embedding-download-')) throw new Error('Ruta temporal inesperada');
  fs.rmSync(temporary, { recursive: true, force: true });
}
