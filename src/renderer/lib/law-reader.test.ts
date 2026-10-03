import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { filterArticles, findArticle, formatArticleCitation, parseLawMarkdown } from './law-reader';

const sample = `# Ley Federal del Trabajo

> Código: LFT
> Verificación oficial: 2026-08-12
**Artículo 1**
La presente Ley es de observancia general.

**Artículo 47**
Son causas de rescisión de la relación de trabajo:
I. Engañarlo el trabajador.
**Artículo 334 Bis**
Las personas trabajadoras del hogar.
`;

describe('law reader', () => {
  it('splits the installed corpus format into provisions', () => {
    const law = parseLawMarkdown(sample);

    expect(law.title).toBe('Ley Federal del Trabajo');
    expect(law.metadata['Verificación oficial']).toBe('2026-08-12');
    expect(law.articles.map((article) => article.label)).toEqual(['Artículo 1', 'Artículo 47', 'Artículo 334 Bis']);
    expect(law.articles[1].body).toBe('Son causas de rescisión de la relación de trabajo:\nI. Engañarlo el trabajador.');
  });

  it('finds the cited article from different reference styles', () => {
    const { articles } = parseLawMarkdown(sample);
    expect(findArticle(articles, 'Artículo 47')?.number).toBe('47');
    expect(findArticle(articles, 'art. 334 bis')?.number).toBe('334 Bis');
    expect(findArticle(articles, '4')).toBeUndefined();
  });

  it('filters by article number first and then by text', () => {
    const { articles } = parseLawMarkdown(sample);
    expect(filterArticles(articles, '47')[0].number).toBe('47');
    expect(filterArticles(articles, 'rescision').map((article) => article.number)).toEqual(['47']);
  });

  it('cites only the selected provision', () => {
    const { articles } = parseLawMarkdown(sample);
    const citation = formatArticleCitation(articles[1], 'Ley Federal del Trabajo', 'LFT');
    expect(citation).toContain('Artículo 47 de la Ley Federal del Trabajo (LFT)');
    expect(citation).not.toContain('observancia general');
  });

  it('parses every installed law into its provisions', () => {
    const corpusDir = path.resolve(__dirname, '../../../legal-runtime/corpus');
    const manifest = JSON.parse(fs.readFileSync(path.join(corpusDir, 'corpus-manifest.json'), 'utf8'));
    for (const law of manifest.laws as Array<{ code: string; corpusFile: string }>) {
      const parsed = parseLawMarkdown(fs.readFileSync(path.join(corpusDir, law.corpusFile), 'utf8'));
      expect(parsed.articles.length, law.code).toBeGreaterThan(50);
    }
  });
});
