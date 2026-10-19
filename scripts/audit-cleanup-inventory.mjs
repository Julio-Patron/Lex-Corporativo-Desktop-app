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
  ['screens-electron', 'retirado', 'Capturas de septiembre de 2026 sin referencias en código, build ni CI; retiradas del repositorio el 19-oct-2026 por decisión del responsable. La historia de Git las conserva.', 'git ls-files screens-electron vacío; evidencia visual vigente en reports/ux-ui mediante test:ui:electron'],
  ['scratch', 'mantenimiento', 'Directorio local ignorado. Sólo se eliminan las carpetas temporales con prefijo performance-, data-audit- y security- que dejan los ensayos.', 'Recorridos mantenidos en tests/; no borrar archivos preexistentes'],
  ['reports', 'mantenimiento', 'Directorio local ignorado con evidencia regenerable; conservar audits/*-a718988.json y ci/ hasta publicar el nuevo bundle de evidencia.', 'Verificar SHA de cada informe antes de archivar'],
  ['out', 'regenerable', 'Salida de compilación vigente, necesaria para pruebas Electron.', 'npm run build y recorridos Electron'],
  ['release', 'regenerable', 'Salida local de electron-builder. Un instalador de piloto se conserva junto con release/pilot-manifest.json hasta terminar el piloto.', 'Hashes y manifiesto de piloto'],
  ['.npm-cache', 'mantenimiento', 'No borrar: mantenimiento opcional sin efecto funcional.', 'Reproducibilidad mediante npm ci en CI'],
  ['node_modules', 'necesario', 'Conservar para pruebas; auditar vulnerabilidades/licencias por separado.', 'npm ci y ABI Node/Electron'],
  ['legal-runtime/corpus', 'necesario', 'Conservar íntegro.', 'audit:corpus-governance:strict; audit:legal-knowledge:strict'],
  ['legal-runtime/lance_data', 'necesario', 'Conservar archivos internos de LanceDB.', 'audit:legal-retrieval; eval:legal-rag'],
  ['legal-runtime/models', 'necesario', 'Conservar MiniLM; no es un LLM generativo. Empaquetar sólo los cuatro recursos fijados.', 'verify:embeddings'],
  ['resources', 'necesario', 'Conservar icono Windows y avisos de terceros. No existe icon.icns; el producto se distribuye sólo para Windows.', 'preflight y construcción'],
  ['electron-builder.config.json', 'necesario', 'Sólo el destino win/nsis está soportado; los bloques mac y linux se retiraron porque referenciaban recursos inexistentes.', 'npm run build:electron'],
  ['scripts/repair-legal-anchors.mjs', 'mantenimiento', 'Herramienta de mantenimiento del corpus, referenciada sólo por package.json. Conservar mientras exista el flujo de promoción de corpus.', 'Uso documentado en package.json'],
  ['scripts/export-legal-corpus.mjs', 'mantenimiento', 'Herramienta de mantenimiento del corpus, referenciada sólo por package.json. Conservar mientras exista el flujo de promoción de corpus.', 'Uso documentado en package.json'],
  ['.gitignore', 'necesario', 'Se retiraron las entradas de modelos GGUF (el producto no incluye LLM local) y de un informe HTML que nunca se versionó.', 'git check-ignore sobre rutas de ejemplo'],
  ['.gitattributes', 'necesario', 'Se retiró la regla binaria de *.gguf.', 'Revisión del archivo'],
  ['CLAUDE.md', 'necesario', 'Guía del repositorio actualizada el 19-oct-2026 con la frontera IPC, la CSP compartida y las suites de auditoría.', 'Revisión de referencias y comandos'],
  ['README.md', 'necesario', 'Documenta las auditorías y la evidencia.', 'Revisión de comandos documentados'],
];
const inventory = candidates.map(([relative, classification, decision, verification]) => ({
  path: relative, ...measure(relative), trackedFiles: tracked.filter(file => file === relative || file.startsWith(`${relative}/`)).length,
  gitStatus: git(['status', '--short', '--ignored', '--', relative]),
  references: textFiles.filter(item => item.file !== relative && item.content.includes(relative)).map(item => item.file),
  buildUse: relative === 'node_modules' ? 'Dependencias incluidas por electron-builder' : ['out', 'legal-runtime/corpus', 'legal-runtime/lance_data', 'legal-runtime/models', 'resources'].includes(relative) ? 'Construcción, recursos o empaquetado' : 'Fuera de files/extraResources del instalador',
  classification, decision, verification, owner: 'Responsable de producto; ejecución asistida',
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
