import { describe, expect, it } from 'vitest';
import { portfolioItemsFromCase } from './portfolio';

const metadata = {
  caseId: 'activity_engineering',
  name: 'Ingeniería Jurídica',
  module: 'engineering' as const,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z',
};

describe('portfolio records', () => {
  it('reads drafts and reviews saved by previous versions', () => {
    const items = portfolioItemsFromCase({
      drafts: [{
        id: 'draft-1',
        timestamp: '2026-09-01T12:00:00.000Z',
        prompt: 'Partes: ACME y Beta',
        area: 'laboral',
        templateId: 'laboral-contrato-individual',
        templateTitle: 'Contrato individual de trabajo',
        generatedDoc: '# CONTRATO',
      }],
      analyses: [{
        id: 'analysis-1',
        timestamp: '2026-09-01T13:00:00.000Z',
        files: [{ name: 'contrato.pdf', type: 'application/pdf' }],
        ecosystem: 'integral',
        customInstruction: 'Revisar penas',
        provider: 'gemini',
        result: { summary: 'Dictamen', documentType: 'Contrato', riskScore: 40, risks: [], legalFoundations: [] },
      }],
    }, metadata);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      kind: 'draft',
      caseId: 'activity_engineering',
      record: { title: 'Contrato individual de trabajo', area: 'laboral', source: 'template', instructions: 'Partes: ACME y Beta', document: '# CONTRATO' },
    });
    expect(items[1]).toMatchObject({
      kind: 'review',
      record: { title: 'Revisión de contrato.pdf', fileName: 'contrato.pdf', instruction: 'Revisar penas', reviewMode: 'ai' },
    });
    expect(items[1].kind === 'review' && items[1].record.areas).toHaveLength(5);
  });

  it('recognizes basic reviews produced by the local rules engine', () => {
    const [item] = portfolioItemsFromCase({
      analyses: [{ id: 'r', files: [], ecosystem: 'fiscal', result: { summary: 'x', engine: 'local_rules', risks: [] } }],
    }, metadata);

    expect(item).toMatchObject({ kind: 'review', record: { reviewMode: 'basic', areas: ['fiscal'] } });
  });

  it('skips empty drafts and malformed entries', () => {
    const items = portfolioItemsFromCase({ drafts: [{ id: 'empty', generatedDoc: '   ' }, null], analyses: [{ id: 'no-result' }] }, metadata);
    expect(items).toEqual([]);
  });
});
