import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'node:child_process';
import { verifyEmbeddings } from './download-embeddings.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv.includes('--target=mac') ? 'mac' : process.argv.includes('--target=linux') ? 'linux' : 'win';
const strict = process.argv.includes('--strict');
const checks = [];

function check(id, ok, detail, blocking = true) {
  checks.push({ id, status: ok ? 'pass' : blocking ? 'fail' : 'warn', detail });
}

function exists(relative) {
  return fs.existsSync(path.join(root, relative));
}

check('vector-store', exists('legal-runtime/lance_data/legal_knowledge.lance'), 'LanceDB legal_knowledge.lance');
check('corpus-manifest', exists('legal-runtime/corpus/corpus-manifest.json'), 'Manifiesto canónico del corpus');
check('embedding-model', exists('legal-runtime/models/Xenova/all-MiniLM-L6-v2/onnx/model_quantized.onnx'), 'ONNX MiniLM cuantizado');
try {
  const embeddings = verifyEmbeddings();
  check('embedding-integrity', true, `${embeddings.model}@${embeddings.revision}: hashes correctos`);
} catch (error) {
  check('embedding-integrity', false, error.message);
}
const governance = spawnSync(process.execPath, [path.join(root, 'scripts/generate-corpus-manifest.mjs'), '--check', '--strict'], { encoding: 'utf8' });
check('corpus-integrity', governance.status === 0, 'Manifiesto versionado comprobado sin regeneración');
const iconPath = target === 'mac' ? 'resources/icon.icns' : target === 'win' ? 'resources/icon.ico' : 'resources/icon.png';
check('app-icon', exists(iconPath), iconPath);

const signingConfigured = target !== 'win' || Boolean(process.env.CSC_LINK || process.env.WIN_CSC_LINK || process.env.CSC_NAME);
check('code-signing', signingConfigured, target === 'win' ? 'Certificado/identidad de firma disponible en el entorno' : 'Firma aplicable al destino', strict);
if (target === 'win') {
  check('signing-identity', /^[a-fA-F0-9]{40}$/.test(process.env.WINDOWS_CERTIFICATE_SHA1 || ''), 'Huella del editor esperada para verificar Authenticode', strict);
  const config = JSON.parse(fs.readFileSync(path.join(root, 'electron-builder.config.json'), 'utf8'));
  const destination = `${config.publish.owner}/${config.publish.repo}`;
  check('distribution-repository', Boolean(process.env.DISTRIBUTION_REPOSITORY) && process.env.DISTRIBUTION_REPOSITORY === destination && (!process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY === destination), 'Repositorio de distribución confirmado y coincidente con el feed', strict);
}

const failures = checks.filter(item => item.status === 'fail');
const report = {
  generatedAt: new Date().toISOString(),
  target,
  strict,
  status: failures.length ? 'fail' : 'pass',
  checks,
  nextCommand: failures.length ? null : 'npm run build:electron',
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
