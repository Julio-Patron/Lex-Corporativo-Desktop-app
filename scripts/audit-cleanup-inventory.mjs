import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
const tracked = git(['ls-files']).split('\n');
const textFiles = tracked.filter(file => /\.(?:ts|tsx|mjs|json|md|yml|css)$/.test(file) && !/package-lock|corpus\/|models\//.test(file))
  .map(file => ({ file, content: fs.readFileSync(path.join(root, file), 'utf8') }));
function measure(relative) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return { exists: false, files: 0, bytes: 0 };
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) return { exists: true, files: 0, bytes: 0, skippedLink: true };
  if (!stat.isDirectory()) return { exists: true, files: 1, bytes: stat.size };
  const children = fs.readdirSync(absolute).map(name => measure(path.join(relative, name)));
  return { exists: true, files: children.reduce((sum, item) => sum + item.files, 0), bytes: children.reduce((sum, item) => sum + item.bytes, 0) };
}
const candidates = [
  ['screens-electron', 'mantenimiento', 'Conservar capturas históricas; no empaquetadas. Revisar valor documental antes de retirar.', 'git ls-files screens-electron; búsqueda de referencias; selección del responsable de producto'],
  ['scratch', 'mantenimiento', 'Conservar evidencia y ensayos previos. Sólo los perfiles creados por cada prueba se eliminan al terminar.', 'Recorridos mantenidos en tests/; no borrar perfiles o archivos preexistentes'],
  ['reports', 'mantenimiento', 'Conservar auditoría de 82d567a y nueva evidencia de a718988 en destinos separados.', 'Verificar SHA de cada informe antes de archivar'],
  ['.superdesign', 'mantenimiento', 'Conservar trabajo local pendiente del diseño aprobado.', 'No tocar archivos locales'],
  ['docs/auditoria-ui-2026-10-17.html', 'evidencia-historica', 'Conservar; corresponde a 82d567a y no acredita a718988.', 'Documento original intacto'],
  ['out', 'regenerable', 'Salida de compilación vigente, necesaria para pruebas Electron.', 'npm run build y recorridos Electron'],
  ['release', 'regenerable', 'Conservar cualquier candidato aceptado; no existe autorización para eliminar instaladores.', 'Hashes y manifiesto de aceptación'],
  ['.npm-cache', 'mantenimiento', 'No borrar: mantenimiento opcional sin efecto funcional.', 'Reproducibilidad mediante npm ci en CI'],
  ['node_modules', 'necesario', 'Conservar para pruebas; auditar vulnerabilidades/licencias por separado.', 'npm ci y ABI Node/Electron'],
  ['legal-runtime/corpus', 'necesario', 'Conservar íntegro.', 'audit:corpus-governance:strict; audit:legal-knowledge:strict'],
  ['legal-runtime/lance_data', 'necesario', 'Conservar archivos internos de LanceDB.', 'audit:legal-retrieval; eval:legal-rag'],
  ['legal-runtime/models', 'necesario', 'Conservar MiniLM; no es un LLM generativo. Empaquetar sólo los cuatro recursos fijados.', 'verify:embeddings'],
  ['resources', 'necesario', 'Conservar iconos y recursos de todas las plataformas.', 'preflight y construcción'],
  ['CLAUDE.md', 'necesario', 'Corregir publicación y rutas inexistentes, conservando la arquitectura real.', 'Revisión de referencias y comandos'],
  ['README.md', 'necesario', 'Actualizar controles y ruta de evidencia visual.', 'Revisión de comandos documentados'],
];
const inventory = candidates.map(([relative, classification, decision, verification]) => ({
  path: relative, ...measure(relative), trackedFiles: tracked.filter(file => file === relative || file.startsWith(`${relative}/`)).length,
  gitStatus: git(['status', '--short', '--ignored', '--', relative]),
  references: textFiles.filter(item => item.file !== relative && item.content.includes(relative)).map(item => item.file),
  buildUse: relative === 'node_modules' ? 'Dependencias incluidas por electron-builder' : ['out', 'legal-runtime/corpus', 'legal-runtime/lance_data', 'legal-runtime/models', 'resources'].includes(relative) ? 'Construcción, recursos o empaquetado' : 'Fuera de files/extraResources del instalador',
  classification, decision, verification, owner: 'Codex; selección de evidencia histórica por responsable de producto',
}));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const dependencies = Object.keys(pkg.dependencies).map(name => ({ name, references: textFiles.filter(item => item.file !== 'package.json' && item.content.includes(name)).map(item => item.file), decision: name === 'apache-arrow' ? 'Conservar: dependencia nativa/indirecta de LanceDB y regla asarUnpack; ausencia de import directo no prueba desuso.' : 'Conservar hasta revisar imports dinámicos, CSS y empaquetado.' }));
const tests = tracked.filter(file => /\.test\.[cm]?[jt]sx?$/.test(file));
const groups = new Map();
for (const file of tests) {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n')).digest('hex');
  groups.set(hash, [...(groups.get(hash) || []), file]);
}
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const licenseCounts = {};
const missingLicense = [];
for (const [name, info] of Object.entries(lock.packages)) {
  if (!name) continue;
  const license = info.license || 'sin-metadato';
  licenseCounts[license] = (licenseCounts[license] || 0) + 1;
  if (!info.license) missingLicense.push(name);
}
const report = {
  sourceSha: git(['rev-parse', 'HEAD']), generatedAt: new Date().toISOString(), workingTreeDirty: Boolean(git(['status', '--porcelain'])),
  deletedPaths: [], inventory, dependencies, exactDuplicateTests: [...groups.values()].filter(group => group.length > 1),
  testOverlap: { paths: ['tests/chunking.test.ts', 'src/main/lib/chunking.test.ts'], decision: 'Conservar escenarios diferenciados; hash distinto no basta para consolidar.' },
  licenses: { licenseCounts, missingLicense, acceptance: 'Inventario de metadatos; falta revisar avisos y licencias de binarios redistribuidos y el paquete final.' },
  limitations: ['Referencias textuales no equivalen a un análisis completo de código muerto.', 'No se eliminaron cachés, capturas, modelos ni evidencia local.'],
};
const output = path.join(root, `reports/audits/cleanup-inventory-${report.sourceSha.slice(0, 7)}.json`);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ candidates: inventory.length, exactDuplicateTests: report.exactDuplicateTests.length, dependencyCount: dependencies.length, missingLicense: missingLicense.length, deletedPaths: [] }));
