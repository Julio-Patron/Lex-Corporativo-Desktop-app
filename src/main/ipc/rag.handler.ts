import { ipcMain } from './trusted-ipc';
import { formatForLog } from '../lib/sanitizer';
import * as crypto from 'crypto';
import { z } from 'zod';
import { formatRAGContext, searchLegalArticles, type RAGMatch } from '../lib/rag';
import { rerankLegalArticles } from '../lib/legal-reranker';
import {
  buildRelatedCorpusQueries,
  extractCrossReferencedProvisions,
  type RelatedArticleReference,
  type RelatedCorpusQuery,
} from '../lib/legal-query-expansion';
import { getModuleLabel } from '../lib/prompts';
import { logLegalExecution } from '../lib/traceability';
import { LEGAL_ECOSYSTEMS } from '../../shared/legal-contracts';

const RAGPayloadSchema = z.object({
  query: z.string().trim().min(1).max(500),
  module: z.union([z.enum(LEGAL_ECOSYSTEMS), z.literal('todos')]),
  limit: z.number().int().min(1).max(12).default(8).optional(),
  useReranker: z.boolean().default(true).optional(),
});

function deriveCitationConnection(query: string, source: RAGMatch): string {
  if (source.connection_note?.trim()) return source.connection_note.trim();

  const lawRef = `${source.law_code || source.title} ${source.article_number || source.subtitle || ''}`.trim();
  const terms = (source.matched_terms || []).filter(Boolean).slice(0, 5);
  if (source.retrieval_type === 'direct') {
    return `Referencia directa a ${lawRef} solicitada en la consulta.`;
  }

  const firstSentence = String(source.content || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.:;])\s+/)[0]
    ?.slice(0, 160)
    .trim();

  if (terms.length > 0) {
    return `Conecta con la consulta en ${terms.map(t => `«${t}»`).join(', ')}${firstSentence ? ` — regula: "${firstSentence}${firstSentence.endsWith('.') ? '' : '…'}"` : '.'}`;
  }

  return firstSentence
    ? `Fundamento relacionado en ${lawRef}: "${firstSentence}${firstSentence.endsWith('.') ? '' : '…'}"`
    : `Disposición vinculada con «${query}» en ${lawRef}.`;
}

function deriveSummaryConnection(
  query: string,
  module: z.infer<typeof RAGPayloadSchema>['module'],
  sources: RAGMatch[],
): string {
  if (sources.length === 0) return '';
  const byLaw = new Map<string, string[]>();
  const allTerms = new Set<string>();
  for (const source of sources.slice(0, 6)) {
    const law = String(source.law_code || source.title || 'Corpus').trim();
    const art = String(source.article_number || source.subtitle || '').trim();
    if (!byLaw.has(law)) byLaw.set(law, []);
    if (art && !byLaw.get(law)!.includes(art) && byLaw.get(law)!.length < 3) {
      byLaw.get(law)!.push(art);
    }
    for (const term of source.matched_terms || []) {
      if (allTerms.size < 6) allTerms.add(term);
    }
  }
  const lawSummaries = [...byLaw.entries()].map(([law, arts]) => (
    arts.length > 0 ? `${law} (${arts.join(', ')})` : law
  ));
  const scopeLabel = module === 'todos' ? 'el corpus normativo' : getModuleLabel(module);
  const termsText = allTerms.size > 0
    ? ` a partir de los conceptos ${[...allTerms].map(t => `«${t}»`).join(', ')}`
    : '';
  return `Para la consulta sobre «${query}» en ${scopeLabel}, se identificaron ${sources.length} fundamentos principales en ${lawSummaries.join('; ')}${termsText}. Las disposiciones recuperadas establecen el supuesto normativo aplicable, sus requisitos legales y las remisiones a preceptos correlacionados dentro del corpus.`;
}

export async function processRagSearch(rawPayload: unknown): Promise<{
  context: string;
  connectionSummary: string;
  connectionMode: 'ai' | 'local';
  relatedQueries: RelatedCorpusQuery[];
  citations: Array<{
    id: string | number;
    title: string;
    subtitle?: string;
    content: string;
    law_code?: string;
    article_number?: string;
    module?: string;
    connection?: string;
    matched_terms?: string[];
    retrieval_type?: 'direct' | 'hybrid' | 'lexical' | 'semantic';
    related_refs?: RelatedArticleReference[];
  }>;
}> {
  let parsedPayload: z.infer<typeof RAGPayloadSchema> | null = null;
  try {
    parsedPayload = RAGPayloadSchema.parse(rawPayload);
    const startedAt = Date.now();
    const localResult = await searchLegalArticles(parsedPayload.query, parsedPayload.module, 24);
    const rerankResult = parsedPayload.useReranker === false
      ? { matches: localResult.matches, status: 'disabled' as const }
      : await rerankLegalArticles(parsedPayload.query, parsedPayload.module, localResult.matches);
    const sources = rerankResult.matches.slice(0, parsedPayload.limit || 8);
    console.info(
      `[IPC RAG] Search completed -> module=${parsedPayload.module} localCandidates=${localResult.matches.length} reranker=${rerankResult.status} returned=${sources.length} durationMs=${Date.now() - startedAt}`
    );
    const publicCitations = sources.map((source) => {
      const relatedRefs = source.related_refs
        ?? extractCrossReferencedProvisions(source.law_code, source.article_number, String(source.content || ''));
      return {
        id: source.id,
        title: source.title,
        subtitle: source.subtitle,
        content: source.content,
        law_code: source.law_code,
        article_number: source.article_number,
        module: source.module,
        connection: deriveCitationConnection(parsedPayload!.query, source),
        matched_terms: source.matched_terms,
        retrieval_type: source.retrieval_type,
        related_refs: relatedRefs,
      };
    });
    const connectionSummary = sources.length === 0
      ? ''
      : (rerankResult.synthesis?.trim() || deriveSummaryConnection(parsedPayload.query, parsedPayload.module, sources));
    const connectionMode: 'ai' | 'local' = rerankResult.status === 'applied' ? 'ai' : 'local';
    const relatedQueries = buildRelatedCorpusQueries(
      parsedPayload.query,
      parsedPayload.module,
      publicCitations,
      rerankResult.relatedQueries || [],
    );
    const context = formatRAGContext(sources, parsedPayload.module);
    const finalModelUsed = rerankResult.status === 'applied'
      ? `${rerankResult.provider}:${rerankResult.model}`
      : 'extractive-hybrid-search';

    logLegalExecution({
      requestId: crypto.randomUUID(),
      operation: 'search',
      module: parsedPayload.module,
      primaryModel: 'lancedb-minilm-fts',
      finalModelUsed,
      hasFallback: rerankResult.status === 'fallback',
      fallbackReason: rerankResult.fallbackReason,
      prompt: parsedPayload.query,
      ragContext: context,
      output: context,
      sources,
    });

    return {
      context,
      connectionSummary,
      connectionMode,
      relatedQueries,
      citations: publicCitations,
    };
  } catch (err: any) {
    console.error('[IPC RAG] Search handler failed:', formatForLog(err));
    const rawQuery = (typeof rawPayload === 'object' && rawPayload && 'query' in rawPayload)
      ? String((rawPayload as any).query).slice(0, 500)
      : '';
    const errorMessage = err?.message || 'Error desconocido en búsqueda jurídica';

    try {
      logLegalExecution({
        requestId: crypto.randomUUID(),
        operation: 'search',
        module: (parsedPayload?.module || 'todos') as any,
        primaryModel: 'lancedb-minilm-fts',
        finalModelUsed: 'none',
        hasFallback: false,
        fallbackReason: `rag_search_error: ${errorMessage}`,
        prompt: parsedPayload?.query || rawQuery,
        ragContext: '',
        output: `ERROR: ${errorMessage}`,
        sources: [],
      });
    } catch {
      // Traceability fallback logging
    }

    throw new Error(`[IPC RAG] Fallo en la búsqueda del corpus legal: ${errorMessage}`);
  }
}

export function registerRagHandlers(): void {
  // IPC vector search proxy
  ipcMain.handle('ipc:rag-search', async (_event, rawPayload: unknown) => {
    return processRagSearch(rawPayload);
  });
}
