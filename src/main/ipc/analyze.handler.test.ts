import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  app: {
    getPath: () => process.cwd(),
    getAppPath: () => process.cwd(),
    isPackaged: false,
  },
}));

vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn(),
  env: {},
}));

vi.mock('@lancedb/lancedb', () => ({
  connect: vi.fn(),
}));

import { isAllowedAnalysisFile, parseAnalyzePayload, processAnalyzePayload } from './analyze.handler';

const basePayload = {
  caseId: 'activity_fiscal',
  files: [{
    name: 'contrato.pdf',
    base64: Buffer.from('pdf').toString('base64'),
    mimeType: 'application/pdf',
  }],
};

describe('analysis payload contract', () => {
  it('normalizes the explicit fiscal analysis contract', () => {
    const payload = parseAnalyzePayload({
      ...basePayload,
      ecosystem: 'fiscal',
      module: 'analysis',
      currentDocumentOnly: true,
      focusedInstruction: 'Revisa materialidad y soporte fiscal.',
      promptProfile: 'fiscal_analysis',
    });

    expect(payload.ecosystem).toBe('fiscal');
    expect(payload.module).toBe('analysis');
    expect(payload.currentDocumentOnly).toBe(true);
    expect(payload.focusedInstruction).toBe('Revisa materialidad y soporte fiscal.');
    expect(payload.promptProfile).toBe('fiscal_analysis');
  });

  it('ignores renderer attempts to select an execution mode', () => {
    const payload = parseAnalyzePayload({
      ...basePayload,
      ecosystem: 'fiscal',
      executionMode: 'byok',
    });

    expect(payload).not.toHaveProperty('executionMode');
    expect(payload).not.toHaveProperty('cloudConsent');
  });

  it('rejects a renderer-provided requestId so main owns analysis isolation', () => {
    expect(() => parseAnalyzePayload({
      ...basePayload,
      ecosystem: 'fiscal',
      requestId: 'user-controlled-id',
    })).toThrow();
  });

  it('accepts mercantile analysis for engineering document review', () => {
    const payload = parseAnalyzePayload({
      ...basePayload,
      ecosystem: 'mercantil',
      module: 'analysis',
      currentDocumentOnly: true,
      focusedInstruction: 'Revisa riesgos contractuales.',
      promptProfile: 'mercantil_analysis',
    });

    expect(payload.ecosystem).toBe('mercantil');
    expect(payload.module).toBe('analysis');
    expect(payload.promptProfile).toBe('mercantil_analysis');
  });

  it('accepts CFDI XML as local text evidence', () => {
    expect(isAllowedAnalysisFile({ name: 'cfdi.xml', mimeType: 'application/xml' })).toBe(true);
    expect(isAllowedAnalysisFile({ name: 'cfdi.xml', mimeType: 'application/octet-stream' })).toBe(true);
  });

  it('requests analysis RAG instructions (isDrafting=false) during document audit', async () => {
    const getHybridLegalContext = vi.fn().mockResolvedValue({
      context: '<CONTEXTO LEGAL>CFF Artículo 27</CONTEXTO LEGAL>',
      sources: [{ id: 'cff-27', type: 'statute', title: 'CFF', law_code: 'CFF', article_number: 'Artículo 27', content: 'RFC', similarity: 0.9 }],
    });

    await processAnalyzePayload(
      {
        ecosystem: 'fiscal',
        files: [{ name: 'contrato.txt', mimeType: 'text/plain', base64: Buffer.from('Contrato de servicios').toString('base64') }],
      },
      null,
      {
        extractDocumentContent: vi.fn().mockResolvedValue({
          text: 'Contrato de servicios',
          pages: [{ pageNumber: 1, text: 'Contrato de servicios' }],
          contentHash: 'hash-1',
        }),
        chunkDocumentPages: vi.fn().mockReturnValue([{ text: 'Contrato de servicios', pageNumber: 1, chunkIndex: 0 }]),
        indexUserDocument: vi.fn().mockResolvedValue({ fileName: 'contrato.txt', contentHash: 'hash-1', chunkCount: 1 }),
        getHybridLegalContext,
        cleanupUserDocumentRequest: vi.fn().mockResolvedValue(undefined),
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      },
    );

    expect(getHybridLegalContext).toHaveBeenCalledWith(expect.any(String), 'fiscal', expect.any(Number), false, 'byok');
  });
});
