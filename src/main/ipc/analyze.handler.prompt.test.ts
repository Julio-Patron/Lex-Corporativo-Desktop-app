import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('../lib/byok-settings', () => ({
  getActiveByokConfig: () => ({ enabled: true, apiKey: 'clave-de-prueba', provider: 'anthropic', model: 'modelo-de-prueba', maxInputChars: 60_000 }),
}));

vi.mock('../lib/byok-client', async () => {
  const actual = await vi.importActual<typeof import('../lib/byok-client')>('../lib/byok-client');
  return { ...actual, generateByokText: vi.fn() };
});

vi.mock('../lib/traceability', () => ({
  logLegalExecution: vi.fn(),
}));

import { generateByokText } from '../lib/byok-client';
import { processAnalyzePayload } from './analyze.handler';

const SOURCES = {
  mercantil: { id: 'law:ccom:78', type: 'statute', title: 'Código de Comercio', law_code: 'CCom', article_number: 'Artículo 78', content: 'En las convenciones mercantiles cada uno se obliga en la manera y términos que aparezca que quiso obligarse.', similarity: 0.9 },
  laboral: { id: 'law:lft:61', type: 'statute', title: 'Ley Federal del Trabajo', law_code: 'LFT', article_number: 'Artículo 61', content: 'La duración máxima de la jornada será: ocho horas la diurna.', similarity: 0.9 },
  fiscal: { id: 'law:cff:29', type: 'statute', title: 'Código Fiscal de la Federación', law_code: 'CFF', article_number: 'Artículo 29', content: 'Cuando las leyes fiscales establezcan la obligación de expedir comprobantes fiscales.', similarity: 0.9 },
} as const;

// Contexto con el formato de formatRAGContext, que trae sus propias instrucciones por materia.
const getHybridLegalContext = vi.fn(async (_query: string, ecosystem: keyof typeof SOURCES) => ({
  context: `<CONTEXTO LEGAL>\n— [FUENTE_ID=${SOURCES[ecosystem].id}] ${SOURCES[ecosystem].law_code}\n</CONTEXTO LEGAL>\n\nINSTRUCCIONES:\n1. Fundamenta tu respuesta únicamente con fuentes de ${ecosystem} del contexto verificado.\n3. Responde únicamente con la información que se encuentre en el contexto proporcionado.`,
  sources: [SOURCES[ecosystem]],
}));

async function analyzeWith(ecosystems: Array<keyof typeof SOURCES>) {
  await processAnalyzePayload(
    {
      ecosystems,
      files: [{ name: 'contrato.txt', mimeType: 'text/plain', base64: Buffer.from('Contrato de prestación de servicios').toString('base64') }],
    },
    null,
    {
      extractDocumentContent: vi.fn().mockResolvedValue({
        text: 'Contrato de prestación de servicios',
        pages: [{ pageNumber: 1, text: 'Contrato de prestación de servicios' }],
        contentHash: 'hash-1',
      }),
      chunkDocumentPages: vi.fn().mockReturnValue([{ text: 'Contrato de prestación de servicios', pageNumber: 1, chunkIndex: 0 }]),
      indexUserDocument: vi.fn().mockResolvedValue({ fileName: 'contrato.txt', contentHash: 'hash-1', chunkCount: 1 }),
      getHybridLegalContext: getHybridLegalContext as any,
      cleanupUserDocumentRequest: vi.fn().mockResolvedValue(undefined),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    },
  );
  const [input] = vi.mocked(generateByokText).mock.calls[0];
  return { system: input.systemInstruction ?? '', prompt: input.prompt, all: `${input.systemInstruction ?? ''}\n${input.prompt}` };
}

describe('prompt de la revisión con IA', () => {
  beforeEach(() => {
    vi.mocked(generateByokText).mockReset();
    // La respuesta no importa: sólo se revisa lo que se envía.
    vi.mocked(generateByokText).mockRejectedValue(new Error('sin respuesta'));
  });

  it('pide sólo las materias elegidas', async () => {
    const { prompt, all } = await analyzeWith(['mercantil', 'laboral']);

    expect(prompt).toContain('TAREA: Revisa el documento en materia mercantil/corporativo y laboral.');
    expect(all).not.toMatch(/fiscal|aduan|comercio exterior|CFDI/i);
  });

  it('usa un solo rol y enfoques de revisión, no de redacción ni de consulta', async () => {
    const { all } = await analyzeWith(['mercantil', 'laboral', 'fiscal']);

    expect(all.match(/\bEres\b/g)).toHaveLength(1);
    expect(all).not.toMatch(/plantilla|machote|El entregable debe|Responde concreta|respuesta ejecutiva|No uses corpus/i);
  });

  it('incluye los artículos sin las instrucciones de consulta de cada materia', async () => {
    const { prompt, all } = await analyzeWith(['mercantil', 'laboral']);

    expect(prompt).toContain('[FUENTE_ID=law:ccom:78]');
    expect(prompt).toContain('[FUENTE_ID=law:lft:61]');
    expect(all).not.toMatch(/Fundamenta tu respuesta únicamente|Responde únicamente con la información|<CONTEXTO LEGAL>/);
  });

  it('no permite citar normas fuera de los artículos recuperados ni llama dictamen al resultado', async () => {
    const { all } = await analyzeWith(['mercantil', 'fiscal']);

    expect(all).not.toMatch(/cuya existencia sea segura/);
    expect(all).not.toMatch(/dictamen|360°/i);
  });

  it('agrega la suficiencia documental sólo cuando la revisión incluye fiscal', async () => {
    const { prompt } = await analyzeWith(['fiscal']);

    expect(prompt).toContain('SUFICIENCIA_DOCUMENTAL_PREVIA');
  });
});
