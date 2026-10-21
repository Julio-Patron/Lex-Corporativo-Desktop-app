import { describe, expect, it } from 'vitest';
import { buildRelatedCorpusQueries, expandLegalQuery, extractCrossReferencedProvisions } from './legal-query-expansion';

describe('legal short-query expansion', () => {
  it('normalizes a household-worker query and adds the controlled benefits vocabulary', () => {
    const result = expandLegalQuery('Prestaciones trabajadadores hogar', 'laboral');
    expect(result.canonical).toBe('prestaciones trabajadores hogar');
    expect(result.retrieval).toContain('personas trabajadoras del hogar');
    expect(result.retrieval).toContain('aguinaldo');
    expect(result.retrieval).toContain('seguridad social');
  });

  it('does not invent article numbers or unrelated laws', () => {
    const result = expandLegalQuery('prestaciones trabajadores hogar', 'laboral');
    expect(result.retrieval).not.toMatch(/\bart(?:iculo)?\s+\d/i);
    expect(result.retrieval).not.toContain('LFT');
  });

  it('keeps unknown queries unchanged after normalization', () => {
    const result = expandLegalQuery('Obligaciones especiales', 'mercantil');
    expect(result.addedTerms).toEqual([]);
    expect(result.retrieval).toBe('obligaciones especiales');
  });

  it('extracts cross-referenced articles inside statute text while ignoring self-references', () => {
    const refs = extractCrossReferencedProvisions(
      'LGTOC',
      'Artículo 170',
      'Artículo 170.- El pagaré deberá contener los requisitos siguientes. Son aplicables los artículos 171 y 174 de esta Ley.',
    );
    expect(refs.map(r => r.article_number)).toEqual(['Artículo 171', 'Artículo 174']);
    expect(refs[0].query).toBe('LGTOC Artículo 171');
  });

  it('keeps the number after a suffix in cross-references and in the self-reference', () => {
    const refs = extractCrossReferencedProvisions(
      'CCOM',
      'Artículo 1390 Bis 12',
      'Lo dispuesto en el artículo 1390 Bis 12 se aplicará conforme a los artículos 1390 Bis 13 y 1390 Bis 14.',
    );
    expect(refs.map(r => r.article_number)).toEqual(['Artículo 1390 Bis 13', 'Artículo 1390 Bis 14']);
  });

  it('builds related corpus queries combining cross-references and domain topics', () => {
    const related = buildRelatedCorpusQueries(
      'requisitos del pagare',
      'mercantil',
      [
        {
          law_code: 'LGTOC',
          article_number: 'Artículo 170',
          content: 'En los términos del artículo 171 y del artículo 174.',
        },
      ],
      ['endoso en propiedad y procuración LGTOC'],
    );
    expect(related.some(item => item.kind === 'cross_reference' && item.query === 'LGTOC Artículo 171')).toBe(true);
    expect(related.some(item => item.query.includes('endoso'))).toBe(true);
  });
});
