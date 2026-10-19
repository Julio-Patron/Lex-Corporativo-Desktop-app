import { describe, expect, it } from 'vitest';
import type { RAGMatch } from './rag';
import { applyRerankRanking, buildLocalConsultationInsights } from './legal-reranker';

const candidates: RAGMatch[] = [
  { id: 'a', type: 'statute', title: 'LFT', content: 'A', similarity: 0.8, retrieval_type: 'hybrid' },
  { id: 'b', type: 'statute', title: 'LFT', content: 'B', similarity: 1, retrieval_type: 'direct' },
  { id: 'c', type: 'statute', title: 'LFT', content: 'C', similarity: 0.7, retrieval_type: 'semantic' },
];

describe('legal BYOK reranker validation', () => {
  it('ranks only known candidates and keeps direct provisions pinned first', () => {
    const result = applyRerankRanking(candidates, {
      ranking: [
        { id: 'c', relevance: 95, connection: 'Establece el supuesto principal consultado.' },
        { id: 'a', relevance: 70 },
        { id: 'b', relevance: 10 },
      ],
    });
    expect(result?.map(item => item.id)).toEqual(['b', 'c', 'a']);
    expect(result?.[1].rerank_score).toBe(0.95);
    expect(result?.[1].connection_note).toBe('Establece el supuesto principal consultado.');
  });

  it('rejects incomplete, duplicate, or invented rankings', () => {
    expect(applyRerankRanking(candidates, { ranking: [{ id: 'a', relevance: 90 }] })).toBeNull();
    expect(applyRerankRanking(candidates, { ranking: [
      { id: 'a', relevance: 90 },
      { id: 'a', relevance: 80 },
      { id: 'invented', relevance: 70 },
    ] })).toBeNull();
  });

  it('builds deterministic local consultation synthesis and per-article connection notes', () => {
    const insights = buildLocalConsultationInsights('requisitos del pagare', 'mercantil', [
      {
        id: '170',
        type: 'statute',
        title: 'Ley General de Títulos y Operaciones de Crédito',
        law_code: 'LGTOC',
        article_number: 'Artículo 170',
        content: 'El pagaré deberá contener la mención de ser pagaré y la promesa incondicional de pagar.',
        similarity: 0.92,
        retrieval_type: 'hybrid',
        matched_terms: ['pagare', 'requisitos'],
      },
    ]);
    expect(insights.synthesis).toContain('LGTOC (Artículo 170)');
    expect(insights.matches[0].connection_note).toContain('«pagare»');
  });
});
