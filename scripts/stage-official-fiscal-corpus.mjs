#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { CORPUS_DIR } from './legal-corpus-config.mjs';
import {
  applyAmendmentSequence,
  compareDirectiveWithDefinition,
  extractLawArticles,
  extractRmfAmendmentProvisions,
  extractRmfAmendmentSummary,
  extractRmfRules,
  renderCorpusMarkdown,
  RMF_2026_FIRST_AMENDMENT,
  RMF_2026_SECOND_AMENDMENT,
  unchangedVerificationDate,
  validateProvisions,
} from './official-fiscal-parser.mjs';
import { parseOfficialPdf } from './official-pdf-reader.mjs';

const args = process.argv.slice(2);
const valueArg = name => args.find(arg => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const sourceDir = path.resolve(valueArg('--source-dir') || 'tmp/pdfs');
const outputDir = path.resolve(valueArg('--output-dir') || 'tmp/fiscal-corpus-stage');
const checkedAt = valueArg('--checked-at') || new Date().toISOString().slice(0, 10);
const shouldPromote = args.includes('--promote');
const shouldDownload = args.includes('--download');

const SOURCES = [
  {
    code: 'CFF',
    name: 'Código Fiscal de la Federación',
    file: 'CFF.pdf',
    corpus: 'cff.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf',
    authority: 'Cámara de Diputados del H. Congreso de la Unión',
    publishedAt: null,
    lastReform: '2026-04-09',
    repeatedHeader: 'CÓDIGO FISCAL DE LA FEDERACIÓN',
    parser: 'law',
    policy: {
      minimumEntries: 220,
      maximumEntries: 450,
      anchors: [
        { id: '1', terms: ['personas físicas', 'las morales'] },
        { id: '69-B', terms: ['comprobantes fiscales', 'inexistencia'] },
      ],
    },
  },
  {
    code: 'LISR',
    name: 'Ley del Impuesto sobre la Renta',
    file: 'LISR.pdf',
    corpus: 'lisr.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf',
    authority: 'Cámara de Diputados del H. Congreso de la Unión',
    publishedAt: '2013-12-11',
    lastReform: '2024-04-01',
    repeatedHeader: 'LEY DEL IMPUESTO SOBRE LA RENTA',
    parser: 'law',
    policy: {
      minimumEntries: 215,
      maximumEntries: 245,
      anchors: [
        { id: '1', terms: ['residentes en México'] },
        { id: '27', terms: ['deducciones autorizadas'] },
        { id: '215', terms: ['personas morales', 'liquidación'] },
      ],
    },
  },
  {
    code: 'RLISR',
    name: 'Reglamento de la Ley del Impuesto sobre la Renta',
    file: 'Reg_LISR.pdf',
    corpus: 'rlisr.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LISR_060516.pdf',
    authority: 'Cámara de Diputados del H. Congreso de la Unión',
    publishedAt: '2015-10-08',
    lastReform: '2016-05-06',
    repeatedHeader: 'REGLAMENTO DE LA LEY DEL IMPUESTO SOBRE LA RENTA',
    parser: 'law',
    policy: {
      minimumEntries: 313,
      maximumEntries: 313,
      anchors: [
        { id: '1', terms: ['Ley del Impuesto sobre la Renta'] },
        { id: '313', terms: ['certificados bursátiles', 'SAT'] },
      ],
    },
  },
  {
    code: 'LIVA',
    name: 'Ley del Impuesto al Valor Agregado',
    file: 'LIVA.pdf',
    corpus: 'liva.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf',
    authority: 'Cámara de Diputados del H. Congreso de la Unión',
    publishedAt: '1978-12-29',
    lastReform: '2021-11-12',
    repeatedHeader: 'LEY DEL IMPUESTO AL VALOR AGREGADO',
    parser: 'law',
    policy: {
      minimumEntries: 55,
      maximumEntries: 80,
      anchors: [
        { id: '1', terms: ['tasa del 16%'] },
        { id: '5', terms: ['acreditable'] },
        { id: '43', terms: ['entidades federativas'] },
      ],
    },
  },
  {
    code: 'RLIVA',
    name: 'Reglamento de la Ley del Impuesto al Valor Agregado',
    file: 'Reg_LIVA.pdf',
    corpus: 'rliva.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LIVA_250914.pdf',
    authority: 'Cámara de Diputados del H. Congreso de la Unión',
    publishedAt: '2006-12-04',
    lastReform: '2014-09-25',
    repeatedHeader: 'REGLAMENTO DE LA LEY DEL IMPUESTO AL VALOR AGREGADO',
    parser: 'law',
    policy: {
      minimumEntries: 84,
      maximumEntries: 84,
      anchors: [
        { id: '1', terms: ['acreditamiento'] },
        { id: '79', terms: ['cantidades acreditables', 'documentación'] },
      ],
    },
  },
  {
    code: 'RMF',
    name: 'Resolución Miscelánea Fiscal para 2026',
    file: 'RMF_2026.pdf',
    corpus: 'rmf.md',
    url: 'https://wwwnp.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/RMF_2026-DOF-28122025.pdf',
    authority: 'Servicio de Administración Tributaria / Diario Oficial de la Federación',
    publishedAt: '2025-12-28',
    lastReform: null,
    parser: 'rmf',
    policy: {
      minimumEntries: 900,
      maximumEntries: 1500,
      allowNumericRegressions: true,
      anchors: [
        { id: '1.1', terms: ['SAT', 'documentos'] },
        { id: '3.16.11', terms: ['factor de acumulación', 'Reglamento de la Ley del ISR'] },
      ],
    },
  },
];

// Resoluciones de modificaciones en orden de publicación. Las que traen texto de reglas se
// aplican una sobre el resultado de la anterior; la que sólo da a conocer anexos no lleva
// definición y se registra como revisada sin cambios en reglas.
const RMF_AMENDMENTS = [
  {
    code: 'RMF-2026-1RM',
    name: 'Primera Resolución de Modificaciones a la RMF para 2026',
    file: 'RMF_2026_1a_mod.pdf',
    url: 'https://wwwnp.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/1aRM_RMF2026.pdf',
    authority: 'Servicio de Administración Tributaria / Diario Oficial de la Federación',
    publishedAt: '2026-07-09',
    effectiveFrom: '2026-07-10',
    definition: RMF_2026_FIRST_AMENDMENT,
  },
  {
    code: 'RMF-2026-2RM',
    name: 'Segunda Resolución de Modificaciones a la RMF para 2026',
    file: 'RMF_2026_2a_mod.pdf',
    url: 'https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/2aRM_RMF2026_01102026.pdf',
    authority: 'Servicio de Administración Tributaria / Diario Oficial de la Federación',
    publishedAt: '2026-10-01',
    effectiveFrom: '2026-10-01',
    definition: RMF_2026_SECOND_AMENDMENT,
  },
  {
    code: 'RMF-2026-3RM',
    name: 'Tercera Resolución de Modificaciones a la RMF para 2026',
    file: 'RMF_2026_3a_mod.pdf',
    url: 'https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/3aRM_RMF2026_DOF_02102026.pdf',
    authority: 'Servicio de Administración Tributaria / Diario Oficial de la Federación',
    publishedAt: '2026-10-02',
    effectiveFrom: '2026-12-31',
    definition: null,
    outOfCorpusChanges: ['Primera Modificación al Anexo 7 de la RMF para 2026 (los anexos no forman parte del corpus).'],
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
  if (magic.toString('ascii') !== '%PDF-') throw new Error(`La fuente no es un PDF válido: ${filePath}`);
}

async function ensureSourceAvailable(source) {
  const filePath = path.join(sourceDir, source.file);
  if (fs.existsSync(filePath)) return;
  if (!shouldDownload) {
    throw new Error(`Falta la fuente local: ${filePath}. Ejecuta el comando con --download para obtenerla de la URL oficial.`);
  }

  console.log(`Descargando ${source.code} desde ${source.url}...`);
  const response = await fetch(source.url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Descarga fallida para ${source.code}: HTTP ${response.status}.`);
  const data = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, data);
  verifyPdf(filePath);
}

function extractLastReform(text) {
  const match = String(text || '').match(/Última Reforma(?: publicada)?\s+DOF\s+(\d{2})-(\d{2})-(\d{4})/i);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

// Usa el lector compartido con la etapa documental, de modo que los encabezados
// tipográficos y los del texto se reconocen con el mismo patrón. Las resoluciones
// modificatorias se segmentan sólo por texto: no tienen encabezados de artículo útiles.
async function parsePdf(filePath, parserKind) {
  if (parserKind === 'amendment') {
    const pdf = await parseOfficialPdf(filePath, 'article');
    return { ...pdf, pages: pdf.pages.map(page => ({ ...page, headings: [] })) };
  }
  return parseOfficialPdf(filePath, parserKind === 'rmf' ? 'rule' : 'article');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
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

async function stageSource(source) {
  const filePath = path.join(sourceDir, source.file);
  verifyPdf(filePath);
  const pdf = await parsePdf(filePath, source.parser);
  const extracted = source.parser === 'rmf'
    ? extractRmfRules(pdf.pages, source)
    : extractLawArticles(pdf.pages, source);
  const validation = validateProvisions(extracted.provisions, source.policy);
  const reportedLastReform = extractLastReform(pdf.pages[0]?.text);
  if (source.lastReform && reportedLastReform !== source.lastReform) {
    validation.status = 'fail';
    validation.failures.push(
      `La fuente reporta última reforma ${reportedLastReform || 'no identificada'}; el snapshot configurado espera ${source.lastReform}.`,
    );
  }
  const sourceSha256 = sha256File(filePath);
  const candidate = writeCandidate(source, extracted.provisions, {
    checkedAt,
    lastReform: reportedLastReform || source.lastReform,
    sourceSha256,
  });
  const candidatePath = candidate.candidatePath;

  const result = {
    code: source.code,
    name: source.name,
    authority: source.authority,
    url: source.url,
    localFile: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
    candidateFile: path.relative(process.cwd(), candidatePath).replace(/\\/g, '/'),
    sourceSha256,
    bytes: fs.statSync(filePath).size,
    pages: pdf.total,
    publishedAt: source.publishedAt,
    lastReform: reportedLastReform || source.lastReform,
    checkedAt: candidate.checkedAt,
    recheckedAt: checkedAt,
    canonicalUnchanged: candidate.unchanged,
    firstProvisionPage: extracted.firstProvisionPage,
    transitoryPage: extracted.transitoryPage,
    provisions: extracted.provisions.length,
    candidateSha256: sha256File(candidatePath),
    validation,
    promotionEligible: validation.status === 'pass' && source.code !== 'RMF',
    promotionBlocker: source.code === 'RMF'
      ? 'Las resoluciones de modificaciones deben aplicarse como parches verificables antes de declarar vigente el corpus consolidado.'
      : validation.status === 'pass' ? null : 'La extracción no superó los controles estructurales.',
    provisionRegistry: extracted.provisions.map(item => ({
      provisionKey: `${source.code.toLowerCase()}:${item.kind}:${item.id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label: item.label,
      sourcePages: item.sourcePages,
      contentSha256: item.contentSha256,
    })),
  };
  Object.defineProperty(result, '_extractedProvisions', { value: extracted.provisions, enumerable: false });
  return result;
}

// Una resolución sin definición sólo es válida si no modifica reglas; una con definición
// debe extraer todos sus bloques y su directiva no puede mencionar reglas no declaradas.
function amendmentIsVerified(amendment) {
  if (amendment.status === 'directive_not_found') return false;
  if (amendment.patchExtractionStatus === 'fail') return false;
  return amendment.directiveCheck?.status !== 'fail';
}

async function stageAmendment(amendment) {
  const { definition, ...metadata } = amendment;
  const filePath = path.join(sourceDir, amendment.file);
  verifyPdf(filePath);
  const pdf = await parsePdf(filePath, 'amendment');
  const summary = extractRmfAmendmentSummary(pdf.pages, amendment);
  const extracted = definition ? extractRmfAmendmentProvisions(pdf.pages, amendment, definition) : null;
  const result = {
    ...metadata,
    localFile: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
    sourceSha256: sha256File(filePath),
    bytes: fs.statSync(filePath).size,
    pages: pdf.total,
    checkedAt,
    ...summary,
    directiveCheck: definition ? compareDirectiveWithDefinition(summary, definition) : null,
    outOfCorpusChanges: definition?.outOfCorpusChanges || amendment.outOfCorpusChanges || [],
    expectedBlocks: extracted?.expectedProvisionIds.length ?? 0,
    parsedBlocks: extracted?.provisions.length ?? 0,
    missingProvisionIds: extracted?.missingProvisionIds ?? [],
    patchExtractionStatus: extracted
      ? extracted.status
      : summary.status === 'checked_no_rule_changes' ? 'not_applicable' : 'fail',
  };
  Object.defineProperty(result, '_extractedProvisions', { value: extracted?.provisions || [], enumerable: false });
  Object.defineProperty(result, '_definition', { value: definition, enumerable: false });
  return result;
}

function consolidateStagedRmf(sources, amendments) {
  const rmf = sources.find(item => item.code === 'RMF');
  if (!rmf) throw new Error('No se encontró el texto base RMF entre las fuentes preparadas.');

  const unverified = amendments.filter(item => !amendmentIsVerified(item));
  if (unverified.length) {
    throw new Error(`Resoluciones de modificaciones sin verificar: ${unverified.map(item => item.code).join(', ')}.`);
  }

  const applied = amendments.filter(item => item._definition);
  const consolidated = applyAmendmentSequence(rmf._extractedProvisions, applied.map(item => ({
    definition: item._definition,
    provisions: item._extractedProvisions,
    metadata: {
      publishedAt: item.publishedAt,
      effectiveFrom: item.effectiveFrom,
      url: item.url,
      sourceSha256: item.sourceSha256,
    },
  })));
  if (consolidated.status !== 'pass') {
    const failures = consolidated.steps.flatMap(step => step.failures.map(failure => `${step.code}: ${failure}`));
    throw new Error(`No fue posible consolidar la RMF: ${failures.join(' ') || 'número de parches inesperado'}`);
  }

  const definition = SOURCES.find(item => item.code === 'RMF');
  const latest = applied.at(-1);
  const candidate = writeCandidate({
    ...definition,
    url: [definition.url, ...applied.map(item => item.url)].join(' + '),
  }, consolidated.provisions, {
    checkedAt,
    lastReform: latest.publishedAt,
    sourceSha256: [rmf.sourceSha256, ...applied.map(item => `amendment=${item.sourceSha256}`)].join('; '),
  });

  const validation = validateProvisions(consolidated.provisions, definition.policy);
  if (validation.status !== 'pass') {
    throw new Error(`La RMF consolidada no superó validación: ${validation.failures.join(' ')}`);
  }

  Object.assign(rmf, {
    candidateSha256: sha256File(candidate.candidatePath),
    checkedAt: candidate.checkedAt,
    canonicalUnchanged: candidate.unchanged,
    lastReform: latest.publishedAt,
    provisions: consolidated.provisions.length,
    validation,
    promotionEligible: true,
    promotionBlocker: null,
    corpusProvenance: 'official_base_with_published_amendment_overlay',
    effectiveFrom: latest.effectiveFrom,
    appliedAmendments: consolidated.steps.map((step, index) => ({
      code: step.code,
      sourceSha256: applied[index].sourceSha256,
      publishedAt: applied[index].publishedAt,
      effectiveFrom: applied[index].effectiveFrom,
      status: step.status,
      patches: step.patches,
    })),
    provisionRegistry: consolidated.provisions.map(item => ({
      provisionKey: `rmf:${item.kind}:${item.id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label: item.label,
      sourcePages: item.sourcePages,
      contentSha256: item.contentSha256,
    })),
  });
  return consolidated;
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const source of [...SOURCES, ...RMF_AMENDMENTS]) await ensureSourceAvailable(source);
  const sources = [];
  for (const source of SOURCES) {
    const staged = await stageSource(source);
    sources.push(staged);
    console.log(`${source.code}: ${staged.provisions} disposiciones, validación ${staged.validation.status}.`);
  }
  const amendments = [];
  for (const definition of RMF_AMENDMENTS) {
    const amendment = await stageAmendment(definition);
    amendments.push(amendment);
    console.log(amendment.directiveCheck
      ? `${amendment.code}: ${amendment.parsedBlocks}/${amendment.expectedBlocks} bloques modificatorios extraídos; directiva ${amendment.directiveCheck.status}.`
      : `${amendment.code}: ${amendment.status}.`);
  }
  const rmfConsolidation = consolidateStagedRmf(sources, amendments);
  const appliedSummary = rmfConsolidation.steps.map(step => `${step.patches.length} de ${step.code}`).join(', ');
  console.log(`RMF: parches oficiales aplicados mediante superposición verificable (${appliedSummary}).`);

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    checkedAt,
    policy: {
      canonicalOverwriteDuringStaging: false,
      duplicateProvisionPolicy: 'block',
      rmfAmendmentsMustBeAppliedDeterministically: true,
      partialAmendmentsUseAuthoritativeOverlay: true,
      unsupportedClaimsAllowed: false,
    },
    summary: {
      officialSources: sources.length + amendments.length,
      stagedBaseSources: sources.length,
      passedStructuralValidation: sources.filter(item => item.validation.status === 'pass').map(item => item.code),
      promotionEligible: sources.filter(item => item.promotionEligible).map(item => item.code),
      blocked: sources.filter(item => !item.promotionEligible).map(item => item.code),
      totalProvisions: sources.reduce((total, item) => total + item.provisions, 0),
    },
    sources,
    amendments,
  };

  const registry = {
    schemaVersion: 1,
    checkedAt,
    sources: sources.map(({ provisionRegistry, ...source }) => ({
      ...source,
      validation: {
        status: source.validation.status,
        failures: source.validation.failures,
        warnings: source.validation.warnings,
      },
    })),
    amendments,
    provisions: sources.flatMap(item => item.provisionRegistry),
  };

  writeJson(path.join(outputDir, 'reconciliation.json'), report);
  writeJson(path.join(outputDir, 'fiscal-source-registry.json'), registry);

  if (shouldPromote) {
    const eligibleSources = sources.filter(item => item.promotionEligible);
    const promotedSources = eligibleSources.filter(item => !item.canonicalUnchanged);
    const unchangedSources = eligibleSources.filter(item => item.canonicalUnchanged);
    for (const source of promotedSources) {
      const definition = SOURCES.find(item => item.code === source.code);
      fs.copyFileSync(path.join(outputDir, 'candidates', definition.corpus), path.join(CORPUS_DIR, definition.corpus));
    }

    writeJson(path.join(CORPUS_DIR, 'fiscal-source-registry.json'), {
      ...registry,
      canonicalPromotions: promotedSources.map(item => item.code),
      unchangedSources: unchangedSources.map(item => item.code),
      provisions: eligibleSources.flatMap(item => item.provisionRegistry),
    });
    console.log(`Promovidos al corpus canónico: ${promotedSources.map(item => item.code).join(', ') || 'ninguno'}.`);
    if (unchangedSources.length) console.log(`Sin cambios, no se reescriben: ${unchangedSources.map(item => item.code).join(', ')}.`);
  }

  if (sources.some(item => item.validation.status !== 'pass') || amendments.some(item => !amendmentIsVerified(item))) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(`Fatal: ${error.stack || error.message || error}`);
  process.exit(1);
});
