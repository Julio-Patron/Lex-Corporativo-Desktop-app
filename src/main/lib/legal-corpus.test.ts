import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => process.cwd(),
  },
}));

import * as legalCorpus from './legal-corpus';
import { getLegalCorpusOverview, isLegalCorpusAvailable, resolveCorpusFile } from './legal-corpus';

describe('legal corpus catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists the installed laws with a link to their official text', () => {
    const overview = getLegalCorpusOverview();

    expect(overview.lawsCount).toBe(16);
    expect(overview.provisionsCount).toBe(7515);
    expect(overview.laws).toHaveLength(16);
    expect(overview.laws.reduce((total, law) => total + law.provisions, 0)).toBe(7515);
    expect(overview.laws.find((law) => law.code === 'LFT')).toMatchObject({
      name: 'Ley Federal del Trabajo',
      module: 'laboral',
      provisions: 1266,
      officialUrl: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf',
    });
    // La RMF vigente es la base más sus resoluciones: se enlaza la página del SAT que las publica.
    expect(overview.laws.find((law) => law.code === 'RMF')?.officialUrl)
      .toBe('https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/normatividad_rmf_rgce2026.html');
    expect(overview.laws.every((law) => /^https:\/\/www\.(?:diputados|sat)\.gob\.mx\//.test(law.officialUrl))).toBe(true);
    expect(isLegalCorpusAvailable()).toBe(true);
  });

  it('does not expose the full text of the laws', () => {
    expect(Object.keys(legalCorpus)).not.toContain('readLegalCorpusLawContent');
    expect(Object.keys(legalCorpus)).not.toContain('getInstalledCorpusLaw');
    expect(JSON.stringify(getLegalCorpusOverview())).not.toMatch(/corpusFile|filePath|\.md"/);
  });

  it('resolves corpus files only from allowlisted Markdown files inside the corpus', () => {
    const corpusDirectory = `${process.cwd()}\\legal-runtime\\corpus`;

    expect(resolveCorpusFile(corpusDirectory, 'lft.md')).toMatch(/legal-runtime[\\/]corpus[\\/]lft\.md$/);
    expect(() => resolveCorpusFile(corpusDirectory, '..\\outside.md')).toThrow(/fuera del corpus/i);
    expect(() => resolveCorpusFile(corpusDirectory, 'lft.pdf')).toThrow(/no permitida/i);
  });
});
