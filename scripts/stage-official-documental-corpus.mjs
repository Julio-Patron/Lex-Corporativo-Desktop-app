#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { CORPUS_DIR } from './legal-corpus-config.mjs';
import {
  extractCompilationLastReform,
  extractDocumentalProvisions,
  extractSourceNotes,
  slugProvisionId,
  verifyCompilationIncludesAmendment,
} from './official-documental-parser.mjs';
import {
  extractRmfAmendmentProvisions,
  renderCorpusMarkdown,
  RGCE_2026_SECOND_AMENDMENT,
  unchangedVerificationDate,
  validateProvisions,
} from './official-fiscal-parser.mjs';
import { parseOfficialPdf } from './official-pdf-reader.mjs';

const args = process.argv.slice(2);
const valueArg = name => args.find(arg => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const sourceDir = path.resolve(valueArg('--source-dir') || 'tmp/pdfs');
const outputDir = path.resolve(valueArg('--output-dir') || 'tmp/documental-corpus-stage');
const checkedAt = valueArg('--checked-at') || new Date().toISOString().slice(0, 10);
const shouldPromote = args.includes('--promote');
const shouldDownload = args.includes('--download');

const SOURCES = [
  {
    code: 'LFT',
    name: 'Ley Federal del Trabajo',
    module: 'laboral',
    file: 'LFT.pdf',
    corpus: 'lft.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf',
    authority: 'Camara de Diputados del H. Congreso de la Union',
    publishedAt: '1970-04-01',
    lastReform: '2026-05-14',
    repeatedHeader: 'LEY FEDERAL DEL TRABAJO',
    parser: 'law',
    policy: {
      minimumEntries: 900,
      maximumEntries: 1300,
      anchors: [
        { id: '20', terms: ['relacion de trabajo', 'contrato individual de trabajo'] },
        { id: '25', terms: ['condiciones de trabajo'] },
        { id: '283 Quáter', terms: ['certificado de cumplimiento', 'obligaciones laborales'] },
      ],
    },
  },
  {
    code: 'LCE',
    name: 'Ley de Comercio Exterior',
    module: 'comercio_exterior',
    file: 'LCE.pdf',
    corpus: 'lce.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LCE.pdf',
    authority: 'Camara de Diputados del H. Congreso de la Union',
    publishedAt: '1993-07-27',
    lastReform: '2026-05-01',
    repeatedHeader: 'LEY DE COMERCIO EXTERIOR',
    parser: 'law',
    policy: {
      minimumEntries: 90,
      maximumEntries: 110,
      anchors: [
        { id: '1', terms: ['regular y promover', 'comercio exterior'] },
        { id: '15', terms: ['medidas de regulacion', 'restriccion no arancelarias'] },
      ],
    },
  },
  {
    code: 'RLCE',
    name: 'Reglamento de la Ley de Comercio Exterior',
    module: 'comercio_exterior',
    file: 'Reg_LCE.pdf',
    corpus: 'rlce.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LCE.pdf',
    authority: 'Camara de Diputados del H. Congreso de la Union',
    publishedAt: '1993-12-30',
    lastReform: '2014-05-22',
    repeatedHeader: 'REGLAMENTO DE LA LEY DE COMERCIO EXTERIOR',
    parser: 'law',
    policy: {
      minimumEntries: 185,
      maximumEntries: 220,
      anchors: [
        { id: '1', terms: ['Ley de Comercio Exterior'] },
        { id: '2', terms: ['Comision', 'Secretaria de Economia'] },
      ],
    },
  },
  {
    code: 'LA',
    name: 'Ley Aduanera',
    module: 'aduanal',
    file: 'LAdua.pdf',
    corpus: 'ley_aduanera.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LAdua.pdf',
    authority: 'Camara de Diputados del H. Congreso de la Union',
    publishedAt: '1995-12-15',
    lastReform: '2025-11-19',
    repeatedHeader: 'LEY ADUANERA',
    parser: 'law',
    policy: {
      minimumEntries: 200,
      maximumEntries: 275,
      anchors: [
        { id: '1', terms: ['despacho aduanero'] },
        { id: '36', terms: ['pedimento'] },
        { id: '59', terms: ['valor en aduana'] },
      ],
    },
  },
  {
    code: 'RLA',
    name: 'Reglamento de la Ley Aduanera',
    module: 'aduanal',
    file: 'Reg_LAdua.pdf',
    corpus: 'rla.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LAdua.pdf',
    authority: 'Camara de Diputados del H. Congreso de la Union',
    publishedAt: '2015-04-20',
    lastReform: '2026-02-23',
    repeatedHeader: 'REGLAMENTO DE LA LEY ADUANERA',
    parser: 'law',
    policy: {
      minimumEntries: 240,
      maximumEntries: 290,
      anchors: [
        { id: '1', terms: ['Ley Aduanera'] },
        { id: '6-B', terms: ['expediente electronico'] },
      ],
    },
  },
  {
    code: 'LIGIE',
    name: 'Ley de los Impuestos Generales de Importacion y de Exportacion',
    module: 'aduanal',
    file: 'LIGIE.pdf',
    corpus: 'ligie.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LIGIE_2022.pdf',
    authority: 'Camara de Diputados del H. Congreso de la Union',
    publishedAt: '2022-06-07',
    lastReform: '2025-12-29',
    repeatedHeader: 'LEY DE LOS IMPUESTOS GENERALES DE IMPORTACIÓN Y DE EXPORTACIÓN',
    parser: 'ligie',
    policy: {
      minimumEntries: 95,
      maximumEntries: 110,
      allowNumericRegressions: true,
      anchors: [
        { id: '1-Capitulo-01', terms: ['animales vivos'] },
        { id: '1-Capitulo-87', terms: ['vehiculos automoviles'] },
        { id: '2', terms: ['reglas generales'] },
      ],
    },
  },
  {
    code: 'RGCE',
    name: 'Reglas Generales de Comercio Exterior para 2026',
    module: 'aduanal',
    file: 'RGCE_2026_compilada_2da.pdf',
    corpus: 'rgce_2026.md',
    // El SAT publicó la compilación con la segunda resolución en la carpeta de la RMF.
    url: 'https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/compiladas/Compilado2daRMRGCEpara2026.pdf',
    authority: 'Servicio de Administracion Tributaria',
    publishedAt: '2025-12-27',
    lastReform: '2026-09-22',
    repeatedHeader: 'REGLAS GENERALES DE COMERCIO EXTERIOR PARA 2026',
    parser: 'rule',
    // La compilación debe traer el texto literal publicado en la resolución más reciente.
    compilationCheck: {
      code: 'RGCE-2026-2RM',
      file: 'RGCE_2026_2da_mod.pdf',
      url: 'https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rgce/rgce/2daRMRGCEpara2026.pdf',
      publishedAt: '2026-09-22',
      definition: RGCE_2026_SECOND_AMENDMENT,
    },
    policy: {
      minimumEntries: 500,
      maximumEntries: 1300,
      allowNumericRegressions: true,
      anchors: [
        { id: '1.1.1', terms: ['objeto'] },
        { id: '1.5.1', terms: ['valor en aduana'] },
        { id: '3.1.8', terms: ['pedimento'] },
      ],
    },
  },
];

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function verifyPdf(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Falta la fuente local: ${filePath}`);
  const handle = fs.openSync(filePath, 'r');
  const magic = Buffer.alloc(5);
  fs.readSync(handle, magic, 0, magic.length, 0);
  fs.closeSync(handle);
  if (magic.toString('ascii') !== '%PDF-') throw new Error(`La fuente no es un PDF valido: ${filePath}`);
}

async function ensureSourceAvailable(source) {
  const filePath = path.join(sourceDir, source.file);
  if (fs.existsSync(filePath)) {
    verifyPdf(filePath);
    return;
  }
  if (!shouldDownload) {
    throw new Error(`Falta la fuente local: ${filePath}. Ejecuta con --download para obtenerla de la URL oficial.`);
  }

  console.log(`Descargando ${source.code} desde ${source.url}...`);
  const response = await fetch(source.url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Descarga fallida para ${source.code}: HTTP ${response.status}.`);
  const data = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, data);
  verifyPdf(filePath);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function extractLastReform(text) {
  const match = String(text || '').match(/Ultima Reforma(?: publicada)?\s+DOF\s+(\d{2})-(\d{2})-(\d{4})/i)
    || String(text || '').match(/Última Reforma(?: publicada)?\s+DOF\s+(\d{2})-(\d{2})-(\d{4})/i);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function validateSource(source, extracted, reportedLastReform) {
  const validation = validateProvisions(extracted.provisions, source.policy);
  if (source.lastReform && reportedLastReform !== source.lastReform) {
    validation.status = 'fail';
    validation.failures.push(
      `La fuente reporta ultima reforma ${reportedLastReform || 'no identificada'}; el snapshot espera ${source.lastReform}.`,
    );
  }
  return validation;
}

// Escribe el candidato. Si sólo difiere del corpus canónico en la fecha de verificación,
// conserva la fecha canónica: la promoción deja intacta la ley y no hay que reindexarla.
function writeCandidate(source, provisions, metadata) {
  const candidatePath = path.join(outputDir, 'candidates', source.corpus);
  const canonicalPath = path.join(CORPUS_DIR, source.corpus);
  let markdown = renderCorpusMarkdown(source, provisions, metadata);
  const preservedCheckedAt = fs.existsSync(canonicalPath)
    ? unchangedVerificationDate(markdown, fs.readFileSync(canonicalPath, 'utf8'))
    : null;
  if (preservedCheckedAt) markdown = renderCorpusMarkdown(source, provisions, { ...metadata, checkedAt: preservedCheckedAt });
  fs.mkdirSync(path.dirname(candidatePath), { recursive: true });
  fs.writeFileSync(candidatePath, markdown, 'utf8');
  return { candidatePath, checkedAt: preservedCheckedAt || metadata.checkedAt, unchanged: Boolean(preservedCheckedAt) };
}

// Extrae los bloques de la resolución suelta y comprueba que la compilación los traiga.
// Las resoluciones se segmentan sólo por texto, igual que en la etapa fiscal.
async function checkCompilation(check, provisions) {
  const { definition, ...metadata } = check;
  const filePath = path.join(sourceDir, check.file);
  verifyPdf(filePath);
  const pdf = await parseOfficialPdf(filePath, 'article');
  const blocks = extractRmfAmendmentProvisions(pdf.pages.map(page => ({ ...page, headings: [] })), {}, definition);
  const comparison = verifyCompilationIncludesAmendment(provisions, blocks.provisions);
  return {
    ...metadata,
    sourceSha256: sha256File(filePath),
    expectedBlocks: blocks.expectedProvisionIds.length,
    missingBlocks: blocks.missingProvisionIds,
    status: blocks.status === 'pass' && comparison.status === 'pass' ? 'pass' : 'fail',
    rules: comparison.rules,
  };
}

async function stage(source) {
  const filePath = path.join(sourceDir, source.file);
  verifyPdf(filePath);
  const pdf = await parseOfficialPdf(filePath, source.parser === 'rule' ? 'rule' : 'article');
  const extracted = extractDocumentalProvisions(pdf.pages, source);
  const firstPageText = pdf.pages[0]?.text;
  const reportedLastReform = extractLastReform(firstPageText)
    || (source.parser === 'rule' ? extractCompilationLastReform(firstPageText) : null)
    || source.lastReform;
  const sourceNotes = extractSourceNotes(firstPageText);
  const validation = validateSource(source, extracted, reportedLastReform);
  const compilationCheck = source.compilationCheck ? await checkCompilation(source.compilationCheck, extracted.provisions) : null;
  if (compilationCheck?.status === 'fail') {
    const failedRules = compilationCheck.rules.filter(rule => rule.status !== 'pass').map(rule => rule.id);
    validation.status = 'fail';
    validation.failures.push(
      `La compilacion no trae el texto literal de ${compilationCheck.code}: ${[...compilationCheck.missingBlocks, ...failedRules].join(', ')}.`,
    );
  }
  const sourceSha256 = sha256File(filePath);
  const candidate = writeCandidate(source, extracted.provisions, {
    checkedAt,
    lastReform: reportedLastReform,
    sourceSha256,
    sourceNotes,
  });
  const candidatePath = candidate.candidatePath;

  return {
    code: source.code,
    name: source.name,
    module: source.module,
    authority: source.authority,
    url: source.url,
    localFile: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
    candidateFile: path.relative(process.cwd(), candidatePath).replace(/\\/g, '/'),
    sourceSha256,
    candidateSha256: sha256File(candidatePath),
    bytes: fs.statSync(filePath).size,
    pages: pdf.total,
    publishedAt: source.publishedAt,
    lastReform: reportedLastReform,
    sourceNotes,
    checkedAt: candidate.checkedAt,
    recheckedAt: checkedAt,
    canonicalUnchanged: candidate.unchanged,
    firstProvisionPage: extracted.firstProvisionPage,
    transitoryPage: extracted.transitoryPage,
    provisions: extracted.provisions.length,
    validation,
    compilationCheck,
    promotionEligible: validation.status === 'pass',
    provisionRegistry: extracted.provisions.map(item => ({
      provisionKey: `${source.code.toLowerCase()}:${item.kind}:${slugProvisionId(item.id)}`,
      label: item.label,
      sourcePages: item.sourcePages,
      contentSha256: item.contentSha256,
    })),
  };
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const source of SOURCES) {
    await ensureSourceAvailable(source);
    if (source.compilationCheck) await ensureSourceAvailable(source.compilationCheck);
  }

  const sources = [];
  for (const source of SOURCES) {
    const result = await stage(source);
    sources.push(result);
    console.log(`${source.code}: ${result.provisions} disposiciones; validacion ${result.validation.status}.`);
    if (result.compilationCheck) {
      const check = result.compilationCheck;
      const passed = check.rules.filter(rule => rule.status === 'pass').length;
      console.log(`${source.code}: la compilacion trae ${passed}/${check.expectedBlocks} bloques literales de ${check.code}.`);
    }
  }

  const registry = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    checkedAt,
    policy: {
      officialPdfOnly: true,
      duplicateProvisionPolicy: 'block',
      unsupportedClaimsAllowed: false,
      ligieTariffChunking: 'chapter_under_article_1',
    },
    sources: sources.map(({ provisionRegistry, ...source }) => source),
    provisions: sources.flatMap(source => source.provisionRegistry),
  };
  writeJson(path.join(outputDir, 'documental-source-registry.json'), registry);

  if (shouldPromote) {
    if (sources.some(source => !source.promotionEligible)) {
      throw new Error('Promocion bloqueada por validacion documental fallida.');
    }
    const promotedSources = sources.filter(source => !source.canonicalUnchanged);
    const unchangedSources = sources.filter(source => source.canonicalUnchanged);
    for (const source of promotedSources) {
      const definition = SOURCES.find(item => item.code === source.code);
      fs.copyFileSync(path.join(outputDir, 'candidates', definition.corpus), path.join(CORPUS_DIR, definition.corpus));
    }
    writeJson(path.join(CORPUS_DIR, 'documental-source-registry.json'), {
      ...registry,
      canonicalPromotions: promotedSources.map(source => source.code),
      unchangedSources: unchangedSources.map(source => source.code),
    });
    console.log(`Promovidos al corpus canonico: ${promotedSources.map(source => source.code).join(', ') || 'ninguno'}.`);
    if (unchangedSources.length) console.log(`Sin cambios, no se reescriben: ${unchangedSources.map(source => source.code).join(', ')}.`);
  }

  if (sources.some(source => source.validation.status !== 'pass')) process.exitCode = 1;
}

main().catch(error => {
  console.error(`Fatal: ${error.stack || error.message || error}`);
  process.exit(1);
});
