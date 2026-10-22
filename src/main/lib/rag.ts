import { app, safeStorage } from 'electron';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as lancedb from '@lancedb/lancedb';
import * as path from 'path';
import type { DocumentChunk } from './chunking';
import { MODULE_ALLOWED_LAW_CODES, getModuleLabel, isLawAllowedForModule, normalizeLawCode, type LegalModule } from './prompts';
import { assessLegalEvidence, getExplicitProvisionTarget, getPreferredLawCodes } from './legal-relevance';
import { expandLegalQuery, extractCrossReferencedProvisions, type ExpandedLegalQuery, type RelatedArticleReference } from './legal-query-expansion';
import { lanceDbWriteMutex } from './mutex';
import { formatForLog } from './sanitizer';

export type LegalSearchScope = LegalModule | 'todos';

function resolveRuntimeOverride(value: string): string {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(app.getAppPath(), value);
}

function getConfiguredModelRoot(): string | null {
  const configuredModelPath = process.env.LEX_EMBEDDING_MODEL_PATH?.trim();
  return configuredModelPath ? path.dirname(resolveRuntimeOverride(configuredModelPath)) : null;
}

function isPathWithinRoot(targetPath: string, rootPath: string): boolean {
  const normTarget = process.platform === 'win32' ? path.resolve(targetPath).toLowerCase() : path.resolve(targetPath);
  const normRoot = process.platform === 'win32' ? path.resolve(rootPath).toLowerCase() : path.resolve(rootPath);
  const relative = path.relative(normRoot, normTarget);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function getConfiguredLancePath(): string | null {
  const configured = process.env.LEX_ENGINE_LANCE_PATH?.trim();
  if (!configured) return null;
  const resolved = resolveRuntimeOverride(configured);
  
  const allowedRoots = [
    path.join(app.getPath('userData'), 'lance_data'),
    app.isPackaged
      ? path.join(process.resourcesPath, 'legal-runtime', 'lance_data')
      : path.join(app.getAppPath(), 'legal-runtime', 'lance_data'),
  ];
  
  if (!allowedRoots.some(root => isPathWithinRoot(resolved, root))) {
    console.warn('[RAG] LEX_ENGINE_LANCE_PATH outside allowed roots, ignoring');
    return null;
  }
  
  return path.basename(resolved).toLowerCase() === 'legal_knowledge.lance'
    ? path.dirname(resolved)
    : resolved;
}

export interface RAGMatch {
  id: string | number;
  type: 'statute' | 'jurisprudence';
  title: string;
  subtitle?: string;
  content: string;
  similarity: number;
  law_code?: string;
  article_number?: string;
  citation_label?: string;
  source_url?: string;
  source_authority?: string;
  source_type?: string;
  last_checked_at?: string;
  provision_key?: string;
  module?: LegalModule;
  verification_status?: 'verified_against_official_source';
  retrieval_type?: 'direct' | 'hybrid' | 'lexical' | 'semantic';
  matched_terms?: string[];
  evidence_coverage?: number;
  rerank_score?: number;
  connection_note?: string;
  related_refs?: RelatedArticleReference[];
}

export interface LegalArticleSearchResult {
  matches: RAGMatch[];
  queryExpansion: ExpandedLegalQuery;
  dbPath: string;
  durationMs: number;
}

export interface UserDocumentMatch {
  id: string | number;
  fileName: string;
  content: string;
  similarity: number;
  module: LegalModule;
  requestId: string;
  contentHash: string;
  chunkIndex: number;
  pageNumber?: number;
}

export interface IndexUserDocumentInput {
  requestId: string;
  fileName: string;
  contentHash: string;
  module: LegalModule;
  chunks: DocumentChunk[];
}

export interface IndexedUserDocument {
  fileName: string;
  contentHash: string;
  chunkCount: number;
}

export const USER_DOCUMENT_TTL_MS = 24 * 60 * 60 * 1000;

export interface AnalysisContextResult {
  context: string;
  legalSources: RAGMatch[];
  documentSources: UserDocumentMatch[];
}

import { pipeline, env } from '@xenova/transformers';

// Global cached model to avoid reloading on each query
let extractorModel: any = null;
const indexedLegalPaths = new Set<string>();
const legalIndexPromises = new Map<string, Promise<void>>();

async function ensureLegalKnowledgeIndices(table: lancedb.Table, dbPath: string): Promise<void> {
  if (indexedLegalPaths.has(dbPath)) return;
  if (typeof table.listIndices !== 'function' || typeof table.createIndex !== 'function') return;
  const existingPromise = legalIndexPromises.get(dbPath);
  if (existingPromise) return existingPromise;

  const promise = (async () => {
    const required = [
      { column: 'law_code', config: lancedb.Index.bitmap() },
      { column: 'article', config: lancedb.Index.btree() },
      { column: 'provision_key', config: lancedb.Index.btree() },
      {
        column: 'content',
        config: lancedb.Index.fts({
          baseTokenizer: 'simple',
          language: 'Spanish',
          lowercase: true,
          stem: true,
          removeStopWords: true,
          asciiFolding: true,
          withPosition: true,
        }),
      },
    ];
    const existing = await table.listIndices();
    const indexedColumns = new Set(existing.flatMap(index => index.columns));
    for (const index of required) {
      if (indexedColumns.has(index.column)) continue;
      await table.createIndex(index.column, { config: index.config, replace: false });
    }
    const active = await table.listIndices();
    const activeColumns = new Set(active.flatMap(index => index.columns));
    if (required.every(index => activeColumns.has(index.column))) indexedLegalPaths.add(dbPath);
  })().catch((error: any) => {
    console.warn('[RAG Local] Could not create one or more optional retrieval indices:', formatForLog(error));
  }).finally(() => {
    legalIndexPromises.delete(dbPath);
  });

  legalIndexPromises.set(dbPath, promise);
  return promise;
}

async function getExtractor() {
  if (!extractorModel) {
    if (app.isPackaged) {
      env.allowRemoteModels = false;
      env.localModelPath = getConfiguredModelRoot() || path.join(process.resourcesPath, 'legal-runtime', 'models');
    } else {
      env.allowRemoteModels = false; // Disable remote lookup to prevent hangs when offline
      env.localModelPath = getConfiguredModelRoot() || path.join(app.getAppPath(), 'legal-runtime', 'models');
      env.cacheDir = env.localModelPath;
    }
    
    try {
      extractorModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    } catch (err) {
      console.error('[RAG Local] Failed to load embedding model. Ensure the model is bundled in extraResources.', formatForLog(err));
      throw err;
    }
  }
  return extractorModel;
}

async function createEmbedding(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data) as number[];
}

const SEARCH_STOPWORDS = new Set([
  'como', 'cual', 'cuales', 'dame', 'definicion', 'define', 'dime', 'donde', 'para', 'porque',
  'puede', 'puedo', 'que', 'quien', 'sobre', 'tiene', 'tengo', 'una', 'uno', 'unas', 'unos',
  'el', 'la', 'los', 'las', 'de', 'del', 'en', 'un', 'con', 'por', 'al', 'su', 'sus', 'es',
  'se', 'lo', 'y', 'o', 'si', 'no', 'te', 'me', 'le', 'les', 'nos', 'ya'
]);

function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getQueryTerms(query: string): string[] {
  return [...new Set(
    normalizeForSearch(query)
      .split(' ')
      // Allow terms >= 1 char so article numbers and acronyms like SA, CV, 51 are not dropped.
      .filter(term => term.length >= 1 && !SEARCH_STOPWORDS.has(term))
  )];
}

function scoreLexicalMatch(row: any, terms: string[]): number {
  if (terms.length === 0) return 0;

  const lawCode = normalizeLawCode(row.law_code || row.title) || '';
  const article = normalizeForSearch(String(row.article || ''));
  const content = normalizeForSearch(`${row.title || ''} ${row.article || ''} ${row.content || ''}`);
  
  const contentWords = new Set(content.split(' '));
  const articleWords = new Set(article.split(' '));
  let score = 0;

  for (const term of terms) {
    const contentHasTerm = contentWords.has(term) || (
      term.length >= 6 && [...contentWords].some(word => word.length >= 6 && word.startsWith(term.slice(0, 6)))
    );
    if (contentHasTerm) score += 4;
    if (articleWords.has(term)) score += 2;
    if (contentHasTerm && lawCode === 'LGTOC' && ['pagare', 'cheque', 'endoso', 'aval', 'letra'].includes(term)) score += 5;
    if (contentHasTerm && lawCode === 'LGSM' && ['sociedad', 'sociedades', 'asamblea', 'accion', 'acciones', 'disolucion', 'liquidador', 'disolver'].includes(term)) score += 5;
    if (contentHasTerm && lawCode === 'CFF' && ['materialidad', 'deducibilidad', 'cfdi', '69b', '69'].includes(term)) score += 5;
    if (contentHasTerm && lawCode === 'LFT' && ['trabajador', 'trabajadora', 'patron', 'salario', 'jornada', 'prestaciones', 'laboral', 'contrato'].includes(term)) score += 5;
    if (contentHasTerm && lawCode === 'LCE' && ['comercio', 'exterior', 'exportacion', 'importacion', 'cuota', 'compensatoria', 'arancelaria'].includes(term)) score += 5;
    if (contentHasTerm && lawCode === 'RLCE' && ['comision', 'secretaria', 'permiso', 'cupo', 'certificado', 'origen'].includes(term)) score += 5;
    if (contentHasTerm && lawCode === 'LA' && ['aduana', 'aduanal', 'pedimento', 'despacho', 'mercancias', 'regimen', 'valor'].includes(term)) score += 5;
    if (contentHasTerm && lawCode === 'RLA' && ['aduana', 'aduanal', 'expediente', 'electronico', 'agente', 'mandatario', 'prevalidacion'].includes(term)) score += 5;
    if (contentHasTerm && lawCode === 'RGCE' && ['rgce', 'regla', 'anexo', 'pedimento', 'aduana', 'valor', 'despacho'].includes(term)) score += 5;
    if (contentHasTerm && lawCode === 'LIGIE' && ['ligie', 'tigie', 'fraccion', 'arancelaria', 'tarifa', 'capitulo', 'arancel'].includes(term)) score += 5;
  }

  if (terms.includes('pagare') && lawCode === 'LGTOC' && articleWords.has('170')) score += 20;
  if (terms.includes('sa') || terms.includes('cv') || terms.includes('anonima')) {
    if (lawCode === 'LGSM') score += 10;
  }
  if (terms.includes('pedimento') && lawCode === 'LA' && articleWords.has('36')) score += 20;
  if (terms.includes('valor') && lawCode === 'RGCE' && articleWords.has('1') && articleWords.has('5')) score += 12;
  
  return score;
}

async function getLexicalMatches(
  table: lancedb.Table,
  query: string,
  module: LegalSearchScope,
  limit: number
): Promise<any[]> {
  const terms = getQueryTerms(query);
  if (terms.length === 0) return [];

  try {
    const lawFilter = getModuleLawFilter(module);
    let rows: any[];
    try {
      const ftsQuery = terms.join(' ');
      rows = await table
        .search(ftsQuery, 'fts', ['content'])
        .where(lawFilter)
        .limit(Math.max(limit * 4, 80))
        .toArray();
    } catch (ftsError: any) {
      console.info(`[RAG Local] FTS index unavailable for ${module}; using bounded lexical fallback:`, formatForLog(ftsError));
      rows = await table
        .query()
        .where(lawFilter)
        .limit(10_000)
        .toArray();
    }

    return rows
      .map((row: any) => ({ row, score: scoreLexicalMatch(row, terms) }))
      .filter(({ row, score }: { row: any; score: number }) => (
        score > 0 && (module === 'todos' || isLawAllowedForModule(row.law_code || row.title, module))
      ))
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, limit)
      .map(({ row, score }: { row: any; score: number }) => ({ ...row, _lexicalScore: score }));
  } catch (err: any) {
    console.warn(`[RAG Local] Lexical rerank failed for ${module}:`, formatForLog(err));
    return [];
  }
}

function hasLegalKnowledgeTable(dbPath: string): boolean {
  return fs.existsSync(path.join(dbPath, 'legal_knowledge.lance'));
}

function getLocalRagPath(): string {
  const configuredPath = getConfiguredLancePath();
  if (configuredPath) return configuredPath;
  const userDataPath = path.join(app.getPath('userData'), 'lance_data');
  const bundledPath = app.isPackaged
    ? path.join(process.resourcesPath, 'legal-runtime', 'lance_data')
    : path.join(app.getAppPath(), 'legal-runtime', 'lance_data');

  if (!app.isPackaged) return bundledPath;

  return synchronizePackagedLegalKnowledge(userDataPath, bundledPath)
    ? userDataPath
    : path.join(app.getPath('userData'), 'legal-retrieval-disabled');
}

export function getLegalKnowledgeRuntimePath(): string {
  return getLocalRagPath();
}

function getUserDocumentsRagPath(): string {
  const userDocumentsPath = path.join(app.getPath('userData'), 'lance_data');
  fs.mkdirSync(userDocumentsPath, { recursive: true });
  return userDocumentsPath;
}

function hasUserDocumentsTable(dbPath: string): boolean {
  return fs.existsSync(path.join(dbPath, 'user_documents.lance'));
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function toStoredLawCode(code: string): string {
  return code === 'CCOM' ? 'CCom' : code;
}

function getModuleLawFilter(module: LegalSearchScope): string {
  const lawCodes = module === 'todos'
    ? [...new Set(Object.values(MODULE_ALLOWED_LAW_CODES).flat())]
    : MODULE_ALLOWED_LAW_CODES[module];
  return lawCodes
    .map(code => `law_code = '${escapeSqlLiteral(toStoredLawCode(code))}'`)
    .join(' OR ');
}

function getCorpusManifestPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'legal-runtime', 'corpus-manifest.json')
    : path.join(app.getAppPath(), 'legal-runtime', 'corpus', 'corpus-manifest.json');
}

function getVerifiedLawCodes(): Set<string> {
  const manifestPath = getCorpusManifestPath();
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return new Set(
      (Array.isArray(manifest?.laws) ? manifest.laws : [])
        .filter((law: any) => (
          law?.source?.verificationStatus === 'verified_against_official_source'
          && law?.structure?.duplicateRows === 0
          && law?.structure?.extractionArtifacts?.total === 0
        ))
        .map((law: any) => normalizeLawCode(law.code))
        .filter(Boolean),
    );
  } catch (error: any) {
    console.error('[RAG Local] Corpus governance manifest is missing or invalid; legal retrieval is disabled.', formatForLog(error));
    return new Set();
  }
}

function getBundledVectorSignature(): string | null {
  try {
    const manifest = JSON.parse(fs.readFileSync(getCorpusManifestPath(), 'utf8'));
    return typeof manifest?.vectorStore?.sha256 === 'string' ? manifest.vectorStore.sha256 : null;
  } catch {
    return null;
  }
}

function synchronizePackagedLegalKnowledge(userDataPath: string, bundledPath: string): boolean {
  const signature = getBundledVectorSignature();
  const sourceTable = path.join(bundledPath, 'legal_knowledge.lance');
  const targetTable = path.join(userDataPath, 'legal_knowledge.lance');
  const stagingTable = path.join(userDataPath, 'legal_knowledge.lance.next');
  const backupTable = path.join(userDataPath, 'legal_knowledge.lance.previous');
  const markerPath = path.join(userDataPath, 'legal_knowledge.version.json');

  if (!signature || !fs.existsSync(sourceTable)) return false;

  try {
    const marker = fs.existsSync(markerPath) ? JSON.parse(fs.readFileSync(markerPath, 'utf8')) : null;
    if (fs.existsSync(targetTable) && marker?.vectorStoreSha256 === signature) return true;

    fs.mkdirSync(userDataPath, { recursive: true });
    if (!fs.existsSync(targetTable) && fs.existsSync(backupTable)) fs.renameSync(backupTable, targetTable);
    fs.rmSync(stagingTable, { recursive: true, force: true });
    fs.cpSync(sourceTable, stagingTable, { recursive: true, force: true });
    fs.rmSync(backupTable, { recursive: true, force: true });
    if (fs.existsSync(targetTable)) fs.renameSync(targetTable, backupTable);

    try {
      fs.renameSync(stagingTable, targetTable);
      fs.writeFileSync(markerPath, `${JSON.stringify({ vectorStoreSha256: signature })}\n`, 'utf8');
      fs.rmSync(backupTable, { recursive: true, force: true });
      return true;
    } catch (error) {
      fs.rmSync(stagingTable, { recursive: true, force: true });
      if (!fs.existsSync(targetTable) && fs.existsSync(backupTable)) fs.renameSync(backupTable, targetTable);
      throw error;
    }
  } catch (error: any) {
    console.error('[RAG Local] Packaged legal corpus synchronization failed; retrieval is disabled.', formatForLog(error));
    return false;
  }
}


export async function isLocalRagAvailable(): Promise<boolean> {
  const dbPath = getLocalRagPath();

  if (!hasLegalKnowledgeTable(dbPath) || getVerifiedLawCodes().size === 0) return false;

  let db: lancedb.Connection | null = null;
  let table: lancedb.Table | null = null;
  try {
    db = await lancedb.connect(dbPath);
    table = await db.openTable('legal_knowledge');
    await ensureLegalKnowledgeIndices(table, dbPath);
    return true;
  } catch (err: any) {
    console.warn('[RAG Local] LanceDB availability check failed:', formatForLog(err));
    return false;
  } finally {
    table?.close?.();
    db?.close?.();
  }
}

async function searchLegalKnowledge(
  evidenceQuery: string,
  retrievalQuery: string,
  module: LegalSearchScope,
  vector: number[],
  limit: number
): Promise<{ matches: RAGMatch[]; dbPath: string }> {
  const dbPath = getLocalRagPath();
  const db = await lancedb.connect(dbPath);
  let table: lancedb.Table | null = null;
  try {
    table = await db.openTable('legal_knowledge');
    await ensureLegalKnowledgeIndices(table, dbPath);
    const verifiedLawCodes = getVerifiedLawCodes();
    if (verifiedLawCodes.size === 0) return { matches: [], dbPath };
    const rawLimit = Math.max(limit * 4, 20);
    const lawFilter = getModuleLawFilter(module);

    const explicitTarget = getExplicitProvisionTarget(evidenceQuery);
    const rawPreferredLawCodes = getPreferredLawCodes(evidenceQuery);
    const preferredLawCodes = module === 'todos'
      ? rawPreferredLawCodes
      : new Set([...rawPreferredLawCodes].filter(code => isLawAllowedForModule(code, module)));
    const isShortFocusedQuery = evidenceQuery.trim().split(/\s+/).filter(Boolean).length <= 16;

    let explicitResults: any[] = [];
    if (explicitTarget.lawCode && explicitTarget.id) {
      const storedLawCode = toStoredLawCode(explicitTarget.lawCode);
      const label = `${explicitTarget.kind === 'rule' || ['RMF', 'RGCE'].includes(explicitTarget.lawCode) ? 'Regla' : 'Artículo'} ${explicitTarget.id}`;
      explicitResults = await table
        .query()
        .where(`law_code = '${escapeSqlLiteral(storedLawCode)}' AND article = '${escapeSqlLiteral(label)}' AND (${lawFilter})`)
        .limit(1)
        .toArray();
    }

    let searchResults: any[] = [];
    try {
      searchResults = await table
        .vectorSearch(vector)
        .where(lawFilter)
        .limit(rawLimit)
        .toArray();
    } catch (err: any) {
      console.warn(`[RAG Local] Module filter failed for ${module}; using post-filter fallback:`, formatForLog(err));
    }

    if (searchResults.length === 0) {
      searchResults = await table
        .vectorSearch(vector)
        .limit(rawLimit)
        .toArray();
    }

    const lexicalResults = (await getLexicalMatches(table, retrievalQuery, module, rawLimit))
      .filter((row: any) => verifiedLawCodes.has(normalizeLawCode(row.law_code || row.title) || ''));
    const candidateMap = new Map<string, any>();
    const mergeCandidate = (row: any, signal: 'direct' | 'lexical' | 'semantic') => {
      const id = String(row.id || `${row.law_code}-${row.article}`);
      const current = candidateMap.get(id) || {};
      candidateMap.set(id, {
        ...current,
        ...row,
        _explicitMatch: current._explicitMatch || signal === 'direct',
        _lexicalScore: Math.max(Number(current._lexicalScore || 0), Number(row._lexicalScore || 0)),
        _distance: typeof row._distance === 'number' ? row._distance : current._distance,
      });
    };
    explicitResults.forEach(row => mergeCandidate(row, 'direct'));
    searchResults.forEach(row => mergeCandidate(row, 'semantic'));
    lexicalResults.forEach(row => mergeCandidate(row, 'lexical'));

    const candidates = [...candidateMap.values()]
      .filter((r: any) => {
        const lawCode = r.law_code || r.title;
        const normalizedCode = normalizeLawCode(lawCode) || '';
        return verifiedLawCodes.has(normalizedCode)
          && (module === 'todos' || isLawAllowedForModule(lawCode, module))
          && (!isShortFocusedQuery || preferredLawCodes.size === 0 || preferredLawCodes.has(normalizedCode));
      })
      .map((r: any) => {
        const normalizedCode = normalizeLawCode(r.law_code || r.title) || r.law_code || r.title;
        const semanticScore = typeof r._distance === 'number'
          ? Math.max(0, Math.min(1, 1 - r._distance))
          : 0;
        const lexicalScore = Math.max(0, Number(r._lexicalScore || 0));
        const normalizedLexicalScore = Math.min(1, lexicalScore / 40);
        const retrievalType: RAGMatch['retrieval_type'] = r._explicitMatch
          ? 'direct'
          : semanticScore > 0 && lexicalScore > 0
            ? 'hybrid'
            : lexicalScore > 0
              ? 'lexical'
              : 'semantic';
        const preferredBoost = !isShortFocusedQuery && preferredLawCodes.has(normalizedCode) ? 0.04 : 0;
        const localScore = r._explicitMatch
          ? 1
          : retrievalType === 'hybrid'
            ? Math.min(0.99, (semanticScore * 0.55) + (normalizedLexicalScore * 0.45) + 0.08 + preferredBoost)
            : retrievalType === 'lexical'
              ? Math.min(0.95, 0.45 + (normalizedLexicalScore * 0.5) + preferredBoost)
              : Math.min(0.99, semanticScore + preferredBoost);
        const match: RAGMatch = {
          id: r.id || crypto.randomUUID(),
          type: 'statute' as const,
          title: r.title,
          subtitle: r.article,
          content: r.content,
          similarity: localScore,
          law_code: normalizedCode,
          article_number: r.article,
          citation_label: r.citation_label,
          source_url: r.source_url,
          source_authority: r.source_authority,
          source_type: r.source_type,
          last_checked_at: r.last_checked_at,
          provision_key: r.provision_key,
          module: module === 'todos' && ['mercantil', 'laboral', 'comercio_exterior', 'aduanal', 'fiscal'].includes(r.module)
            ? r.module
            : module === 'todos' ? undefined : module,
          verification_status: 'verified_against_official_source' as const,
          retrieval_type: retrievalType,
          related_refs: extractCrossReferencedProvisions(normalizedCode, r.article, String(r.content || '')),
        };
        const assessment = assessLegalEvidence(retrievalQuery, match);
        return {
          match: {
            ...match,
            matched_terms: assessment.matchedTerms,
            evidence_coverage: assessment.coverage,
          },
          assessment,
        };
      })
      .filter(({ assessment }) => assessment.sufficient)
      .sort((left, right) => right.match.similarity - left.match.similarity);

    const matches: RAGMatch[] = candidates
      .map(({ match }) => match)
      .slice(0, limit);

    // Fetch up to 2 directly cross-referenced provisions cited by the top matches
    if (!explicitTarget.id && matches.length > 0 && matches.length < limit) {
      const existingKeys = new Set(
        matches.map(m => `${String(m.law_code || '').toUpperCase()}:${String(m.article_number || '').toUpperCase()}`),
      );
      const crossRefTargets: Array<{ ref: RelatedArticleReference; sourceLabel: string }> = [];
      for (const topMatch of matches.slice(0, 2)) {
        for (const ref of topMatch.related_refs || []) {
          const refKey = `${ref.law_code.toUpperCase()}:${ref.article_number.toUpperCase()}`;
          if (existingKeys.has(refKey)) continue;
          existingKeys.add(refKey);
          crossRefTargets.push({
            ref,
            sourceLabel: `${topMatch.law_code || topMatch.title} ${topMatch.article_number || ''}`.trim(),
          });
          if (crossRefTargets.length >= 2) break;
        }
        if (crossRefTargets.length >= 2) break;
      }

      for (const { ref, sourceLabel } of crossRefTargets) {
        if (matches.length >= limit) break;
        try {
          const storedCode = toStoredLawCode(ref.law_code);
          const rows = await table
            .query()
            .where(`law_code = '${escapeSqlLiteral(storedCode)}' AND article = '${escapeSqlLiteral(ref.article_number)}' AND (${lawFilter})`)
            .limit(1)
            .toArray();
          const row = rows[0];
          if (!row) continue;
          const normalizedCode = normalizeLawCode(row.law_code || row.title) || ref.law_code;
          if (!verifiedLawCodes.has(normalizedCode)) continue;
          matches.push({
            id: row.id || crypto.randomUUID(),
            type: 'statute' as const,
            title: row.title,
            subtitle: row.article,
            content: row.content,
            similarity: 0.72,
            law_code: normalizedCode,
            article_number: row.article,
            citation_label: row.citation_label,
            source_url: row.source_url,
            source_authority: row.source_authority,
            source_type: row.source_type,
            last_checked_at: row.last_checked_at,
            provision_key: row.provision_key,
            module: module === 'todos' && ['mercantil', 'laboral', 'comercio_exterior', 'aduanal', 'fiscal'].includes(row.module)
              ? row.module
              : module === 'todos' ? undefined : module,
            verification_status: 'verified_against_official_source' as const,
            retrieval_type: 'hybrid',
            connection_note: `Disposición correlacionada por remisión expresa en ${sourceLabel}.`,
            related_refs: extractCrossReferencedProvisions(normalizedCode, row.article, String(row.content || '')),
          });
        } catch {
          // Ignore optional cross-reference lookup errors
        }
      }
    }

    return { matches, dbPath };
  } finally {
    table?.close?.();
    db.close?.();
  }
}

/**
 * Returns extractive statute candidates for the official search UI. Controlled
 * expansion improves short queries while the evidence gate evaluates only the
 * user's corrected wording plus the controlled, module-scoped vocabulary.
 */
export async function searchLegalArticles(
  query: string,
  module: LegalSearchScope,
  limit = 24,
): Promise<LegalArticleSearchResult> {
  const startedAt = Date.now();
  const queryExpansion = expandLegalQuery(query, module);
  const vector = await createEmbedding(queryExpansion.retrieval || queryExpansion.evidence);
  const { matches, dbPath } = await searchLegalKnowledge(
    queryExpansion.evidence,
    queryExpansion.retrieval,
    module,
    vector,
    limit,
  );
  return {
    matches,
    queryExpansion,
    dbPath,
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Executes a local vector search over Mexican statutes using LanceDB.
 */
export async function getHybridLegalContext(
  query: string,
  module: LegalModule,
  limit = 6,
  isDrafting = false,
  executionMode: 'local' | 'byok' | 'balanced' = 'balanced',
): Promise<{ context: string; sources: RAGMatch[] }> {
  const startMs = Date.now();

  try {
    const { matches, dbPath } = await searchLegalArticles(query, module, limit);

    console.info(`[RAG Local] Vector search resolved ${matches.length} ${module} sources in ${Date.now() - startMs}ms from ${dbPath}`);

    const preparedSources = prepareLegalSourcesForEngine(matches, executionMode);
    const context = formatRAGContext(preparedSources, module, isDrafting);
    return { context, sources: preparedSources };
  } catch (err: any) {
    console.warn('[RAG Local] Search failed — Operating without verified RAG database context:', formatForLog(err));
    return { context: '', sources: [] };
  }
}

/**
 * Keeps the same authoritative retrieval lane for every engine while adapting
 * context density to the engine that must consume it. Explicit/high-scoring
 * provisions remain first and a second pass adds cross-law coverage.
 */
export function prepareLegalSourcesForEngine(
  matches: RAGMatch[],
  executionMode: 'local' | 'byok' | 'balanced',
): RAGMatch[] {
  const policy = executionMode === 'local'
    ? { maxSources: 4, maxCharsPerSource: 1_400 }
    : executionMode === 'byok'
      ? { maxSources: 8, maxCharsPerSource: 3_200 }
      : { maxSources: 6, maxCharsPerSource: 2_200 };
  const selected: RAGMatch[] = [];
  const selectedIds = new Set<string>();
  const selectedLaws = new Set<string>();

  const add = (source: RAGMatch) => {
    const id = String(source.id);
    if (selectedIds.has(id) || selected.length >= policy.maxSources) return;
    selectedIds.add(id);
    selectedLaws.add(String(source.law_code || source.title).toUpperCase());
    selected.push({
      ...source,
      content: source.content.length > policy.maxCharsPerSource
        ? `${source.content.slice(0, policy.maxCharsPerSource)}\n[FRAGMENTO RECORTADO]`
        : source.content,
    });
  };

  // Preserve the strongest source, then favor one source per law before
  // filling remaining capacity by relevance.
  if (matches[0]) add(matches[0]);
  for (const source of matches) {
    const law = String(source.law_code || source.title).toUpperCase();
    if (!selectedLaws.has(law)) add(source);
  }
  for (const source of matches) add(source);
  return selected;
}

export async function getAnalysisContext(
  query: string,
  module: LegalModule,
  requestId: string,
  limit = 6
): Promise<AnalysisContextResult> {
  const startMs = Date.now();

  try {
    const vector = await createEmbedding(query);
    const [legalResult, documentSources] = await Promise.all([
      searchLegalKnowledge(query, query, module, vector, limit).catch((err: any) => {
        console.warn(`[RAG Local] Analysis legal lane failed for ${module}:`, formatForLog(err));
        return { matches: [], dbPath: '' };
      }),
      searchUserDocuments(module, requestId, vector, limit).catch((err: any) => {
        console.warn(`[RAG Local] Analysis document lane failed for ${module}:`, formatForLog(err));
        return [];
      }),
    ]);

    console.info(
      `[RAG Local] Analysis context resolved ${documentSources.length} document chunks and ${legalResult.matches.length} legal sources for ${module} in ${Date.now() - startMs}ms`
    );

    return {
      context: formatAnalysisContext(documentSources, legalResult.matches, module),
      legalSources: legalResult.matches,
      documentSources,
    };
  } catch (err: any) {
    console.warn('[RAG Local] Analysis context failed:', formatForLog(err));
    return {
      context: '',
      legalSources: [],
      documentSources: [],
    };
  }
}

const ENCRYPTED_FIELD_PREFIX = 'encrypted:v1:';

function documentEncryptionAvailable(): boolean {
  return Boolean(safeStorage?.isEncryptionAvailable?.());
}

function sealUserDocumentField(value: string): string {
  if (!documentEncryptionAvailable()) {
    throw new Error('No se puede indexar el documento porque el cifrado del sistema no está disponible.');
  }
  return `${ENCRYPTED_FIELD_PREFIX}${safeStorage.encryptString(value).toString('base64')}`;
}

function openUserDocumentField(value: string): string {
  if (!value.startsWith(ENCRYPTED_FIELD_PREFIX)) return value;
  if (!documentEncryptionAvailable()) {
    throw new Error('No se puede leer el documento temporal porque el cifrado del sistema no está disponible.');
  }
  return safeStorage.decryptString(Buffer.from(value.slice(ENCRYPTED_FIELD_PREFIX.length), 'base64'));
}

export async function searchUserDocuments(
  module: LegalModule,
  requestId: string,
  vector: number[],
  limit: number
): Promise<UserDocumentMatch[]> {
  const dbPath = getUserDocumentsRagPath();
  if (!hasUserDocumentsTable(dbPath)) return [];

  const db = await lancedb.connect(dbPath);
  try {
    const table = await db.openTable('user_documents');
    try {
      const rawLimit = Math.max(limit * 3, 12);
      const requestFilter = `requestId = '${escapeSqlLiteral(requestId)}' AND module = '${escapeSqlLiteral(module)}'`;
      const rows: any[] = await table
        .vectorSearch(vector)
        .where(requestFilter)
        .limit(rawLimit)
        .toArray();

      return rows.flatMap((row: any) => {
        if (row.requestId !== requestId || row.module !== module) return [];
        try {
          return [{
            id: row.id || crypto.randomUUID(),
            fileName: openUserDocumentField(String(row.fileName || 'documento')),
            content: openUserDocumentField(String(row.content || '')),
            similarity: 1.0 - (row._distance || 0),
            module,
            requestId,
            contentHash: row.contentHash || '',
            chunkIndex: Number(row.chunkIndex || 0),
            pageNumber: Number(row.pageNumber || 0) || undefined,
          }];
        } catch (err) {
          console.warn('[RAG Local] Se omitió un fragmento temporal ilegible.', formatForLog(err));
          return [];
        }
      }).slice(0, limit);
    } finally {
      table.close?.();
    }
  } finally {
    db.close?.();
  }
}

/**
 * One line per source with its FUENTE_ID, the identifier the AI must cite.
 */
export function formatLegalSourceLine(m: RAGMatch): string {
  return m.type === 'jurisprudence'
    ? `— [FUENTE_ID=${String(m.id)}] JURISPRUDENCIA [${m.subtitle}]: "${m.content.slice(0, 2000)}"`
    : `— [FUENTE_ID=${String(m.id)}] [FUENTE OFICIAL VERIFICADA] ${m.law_code || m.title} ${m.article_number || ''}: "${m.content.slice(0, 1500)}"`;
}

/**
 * Formats structured RAG citations into an LLM context block
 */
export function formatRAGContext(matches: RAGMatch[], module: LegalSearchScope, isDrafting = false): string {
  if (matches.length === 0) return '';

  const statuteLines = matches
    .filter(m => m.type === 'statute')
    .map(formatLegalSourceLine);

  const jurLines = matches
    .filter(m => m.type === 'jurisprudence')
    .map(formatLegalSourceLine);

  let instructionLines: string[];
  if (isDrafting) {
    instructionLines = [
      '1. Tu objetivo principal es REDACTAR EL INSTRUMENTO O DOCUMENTO solicitado por el usuario.',
      '2. Utiliza los artículos recuperados estrictamente como guía para asegurar que tu redacción cumpla los requisitos de ley.',
      '3. Bajo ninguna circunstancia rechaces la redacción. Si faltan datos geográficos o específicos en el texto legal, utiliza los datos del usuario o deja espacios en blanco (ej. [Ciudad]).',
      '4. Redacta de forma formal, profesional y completa.',
    ];
  } else {
    const moduleLabel = module === 'todos' ? 'Todos los ordenamientos instalados' : getModuleLabel(module);
    instructionLines = [
      `1. Fundamenta tu respuesta únicamente con fuentes de ${moduleLabel} del contexto verificado.`,
      '2. Usa los artículos o reglas recuperadas como base principal de la explicación.',
      '3. Responde únicamente con la información que se encuentre en el contexto proporcionado.',
      '4. Si hay contradicción, prioriza la fuente vigente y explica la tensión sin inventar fundamentos.',
    ];
  }

  return `
<CONTEXTO LEGAL>
ÁREA SOLICITADA: ${module === 'todos' ? 'Todos los ordenamientos instalados' : getModuleLabel(module)}

--- LEYES Y REGLAMENTOS ---
${statuteLines.join('\n\n') || 'No se encontraron artículos específicos.'}

--- CRITERIOS Y JURISPRUDENCIA ---
${jurLines.join('\n\n') || 'No se encontró jurisprudencia relevante.'}
</CONTEXTO LEGAL>

INSTRUCCIONES: 
${instructionLines.join('\n')}
`;
}

export function formatAnalysisContext(
  documentMatches: UserDocumentMatch[],
  legalMatches: RAGMatch[],
  module: LegalModule
): string {
  const documentLines = documentMatches.map(match => {
    const page = match.pageNumber ? ` página ${match.pageNumber}` : '';
    return `- ${match.fileName}${page}, fragmento ${match.chunkIndex + 1}: "${match.content.slice(0, 1500)}"`;
  });

  const legalLines = legalMatches.map(match => (
    `- [FUENTE_ID=${String(match.id)}] ${match.law_code || match.title} ${match.article_number || ''}: "${match.content.slice(0, 1500)}"`
  ));

  return `### DOCUMENTOS ANALIZADOS (Evidencia del Usuario)
${documentLines.join('\n\n') || 'No se recuperaron fragmentos relevantes de los documentos cargados.'}

### FUNDAMENTO LEGAL VERIFICADO (Leyes del Ecosistema)
Área solicitada: ${getModuleLabel(module)}

${legalLines.join('\n\n') || 'No se encontraron artículos específicos del ecosistema solicitado.'}

INSTRUCCIONES:
1. Tu tarea principal es analizar los "DOCUMENTOS ANALIZADOS". Extrae riesgos, obligaciones y datos clave del texto cargado.
2. Si el "FUNDAMENTO LEGAL VERIFICADO" no contiene artículos directamente aplicables, abstente de emitir conclusiones jurídicas; limita la salida a describir el documento y señalar qué fundamento falta.
3. Mantén el análisis dentro del ecosistema ${getModuleLabel(module)} salvo que el usuario pida expresamente impacto transversal.
`;
}

async function ensureUserDocumentIndices(table: lancedb.Table, sample?: Record<string, unknown>): Promise<void> {
  for (const column of ['requestId', 'module', 'contentHash'] as const) {
    if (sample && !(column in sample)) continue;
    await table.createIndex(column, { config: lancedb.Index.btree() }).catch(() => undefined);
  }
}

function plainLanceValue(value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<number>, item => Number(item));
  if (Array.isArray(value)) return value.map(item => typeof item === 'bigint' ? Number(item) : item);
  if (value && typeof value === 'object' && typeof (value as { toArray?: unknown }).toArray === 'function') {
    return plainLanceValue((value as { toArray: () => unknown }).toArray());
  }
  return value;
}

function plainLanceRecord(row: Record<string, unknown>): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith('_') || value === undefined) continue;
    record[key] = plainLanceValue(value);
  }
  return record;
}

async function removeUserDocumentsDirectory(directory: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.rmSync(directory, { recursive: true, force: true });
      if (!fs.existsSync(directory)) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 40 * (attempt + 1)));
  }
  throw lastError instanceof Error ? lastError : new Error('No se pudo borrar la tabla temporal de documentos.');
}

/**
 * table.delete deja el texto en los fragmentos. Se copian las filas vivas, se elimina el directorio
 * y se recrea la tabla. La tabla legal vive en otro directorio y no se toca.
 * Hay que cerrar la conexión anterior: el mutex de Lance no se toma aquí porque no es reentrante.
 */
async function physicallyRewriteUserDocuments(dbPath: string): Promise<void> {
  const directory = path.join(dbPath, 'user_documents.lance');
  if (!fs.existsSync(directory)) return;

  const db = await lancedb.connect(dbPath);
  let rows: Record<string, unknown>[] = [];
  let schema: Awaited<ReturnType<lancedb.Table['schema']>> | null = null;
  try {
    const names = await db.tableNames();
    if (!names.includes('user_documents')) return;
    const table = await db.openTable('user_documents');
    try {
      schema = await table.schema();
      const count = await table.countRows();
      if (count > 0) {
        const fetched = await table.query().limit(count).toArray();
        if (fetched.length !== count) {
          throw new Error('No se pudieron copiar todos los fragmentos temporales antes de reescribir la tabla.');
        }
        rows = fetched.map(row => plainLanceRecord(row as Record<string, unknown>));
      }
    } finally {
      table.close?.();
    }
    await db.dropTable('user_documents');
  } finally {
    db.close?.();
  }

  await removeUserDocumentsDirectory(directory);
  const reopened = await lancedb.connect(dbPath);
  try {
    if (rows.length === 0) {
      if (!schema) throw new Error('No se pudo recrear la tabla temporal vacía.');
      const created = await reopened.createEmptyTable('user_documents', schema);
      created.close?.();
      return;
    }
    const created = await reopened.createTable('user_documents', rows);
    await ensureUserDocumentIndices(created, rows[0]);
    created.close?.();
  } finally {
    reopened.close?.();
  }
}

/**
 * Indexa chunks ya extraídos del usuario en una tabla LanceDB local y escribible.
 * El texto y el nombre se guardan cifrados. Sin cifrado del sistema no hay copia en claro.
 */
export async function indexUserDocument(input: IndexUserDocumentInput): Promise<IndexedUserDocument> {
  const startMs = Date.now();
  const chunks = input.chunks.filter(chunk => chunk.text.trim().length > 0);

  if (chunks.length === 0) {
    throw new Error(`No hay contenido indexable en '${input.fileName}'.`);
  }
  if (!documentEncryptionAvailable()) {
    throw new Error('No se puede indexar el documento porque el cifrado del sistema no está disponible.');
  }

  const sealedFileName = sealUserDocumentField(input.fileName);
  const indexedAt = new Date().toISOString();
  const records = [];
  for (const chunk of chunks) {
    records.push({
      id: crypto.randomUUID(),
      requestId: input.requestId,
      fileName: sealedFileName,
      content: sealUserDocumentField(chunk.text),
      module: input.module,
      contentHash: input.contentHash,
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber ?? 0,
      source: 'analysis_upload',
      indexedAt,
      vector: await createEmbedding(chunk.text),
    });
  }

  const dbPath = getUserDocumentsRagPath();
  const db = await lancedb.connect(dbPath);
  let table: lancedb.Table | null = null;
  try {
    const tableNames = await db.tableNames();
    if (tableNames.includes('user_documents')) {
      table = await db.openTable('user_documents');
      try {
        await table.delete(`requestId = '${escapeSqlLiteral(input.requestId)}' AND contentHash = '${escapeSqlLiteral(input.contentHash)}'`);
        await table.add(records);
      } catch (err: any) {
        console.warn('[RAG Local] Recreating user_documents due to incompatible schema or corrupted table:', formatForLog(err));
        table.close?.();
        table = null;
        await db.dropTable('user_documents');
        table = await db.createTable('user_documents', records);
        await ensureUserDocumentIndices(table);
      }
    } else {
      table = await db.createTable('user_documents', records);
      await ensureUserDocumentIndices(table);
    }
  } finally {
    table?.close?.();
    db.close?.();
  }

  console.info(`[RAG Local] User document indexed for ${input.module}. ${chunks.length} chunks in ${Date.now() - startMs}ms`);

  return {
    fileName: input.fileName,
    contentHash: input.contentHash,
    chunkCount: chunks.length,
  };
}

export async function cleanupUserDocumentRequest(requestId: string): Promise<void> {
  const dbPath = getUserDocumentsRagPath();
  if (!hasUserDocumentsTable(dbPath)) return;

  const unlock = await lanceDbWriteMutex.lock();
  try {
    if (!hasUserDocumentsTable(dbPath)) return;
    const db = await lancedb.connect(dbPath);
    const table = await db.openTable('user_documents');
    try {
      await table.delete(`requestId = '${escapeSqlLiteral(requestId)}'`);
    } finally {
      table.close?.();
      db.close?.();
    }
    await physicallyRewriteUserDocuments(dbPath);
    console.info(`[RAG Local] Cleared temporary chunks for request ${requestId.slice(0, 8)}...`);
  } catch (err: any) {
    console.warn('[RAG Local] Failed to clear temporary user document chunks:', formatForLog(err));
  } finally {
    unlock();
  }
}


export async function purgeExpiredUserDocuments(
  maxAgeMs = USER_DOCUMENT_TTL_MS,
  nowMs = Date.now(),
): Promise<number> {
  if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
    throw new Error('El TTL de documentos temporales debe ser mayor a cero.');
  }

  const dbPath = getUserDocumentsRagPath();
  if (!hasUserDocumentsTable(dbPath)) return 0;

  const unlock = await lanceDbWriteMutex.lock();
  try {
    if (!hasUserDocumentsTable(dbPath)) return 0;
    const db = await lancedb.connect(dbPath);
    const table = await db.openTable('user_documents');
    const cutoffMs = nowMs - maxAgeMs;
    const cutoff = new Date(cutoffMs).toISOString();
    let deleted = 0;
    try {
      const countBefore = await table.countRows();
      await table.delete(`indexedAt < '${cutoff}' OR indexedAt IS NULL`);
      const countAfter = await table.countRows();
      deleted = Math.max(0, countBefore - countAfter);
    } finally {
      table.close?.();
      db.close?.();
    }

    if (deleted > 0) {
      await physicallyRewriteUserDocuments(dbPath);
      console.info(`[RAG Local] Purged ${deleted} temporary user-document chunks older than ${cutoff}.`);
    }
    return deleted;
  } catch (err: any) {
    console.warn('[RAG Local] Failed to purge expired temporary chunks:', formatForLog(err));
    return 0;
  } finally {
    unlock();
  }
}
