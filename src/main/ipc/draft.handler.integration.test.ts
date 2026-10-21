import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

vi.mock('../lib/case-vault', () => ({
  getAnalysis: vi.fn(),
  listCases: vi.fn(),
}));

vi.mock('../lib/byok-settings', () => ({
  getActiveByokConfig: () => ({ enabled: true, apiKey: 'clave-de-prueba', provider: 'gemini', model: 'modelo-de-prueba', maxInputChars: 60_000 }),
}));

vi.mock('../lib/rag', () => ({
  getHybridLegalContext: vi.fn().mockResolvedValue({
    context: 'FUENTE_ID=law:lft:61\nLFT Artículo 61. La duración máxima de la jornada será: ocho horas la diurna.',
    sources: [{ id: 'law:lft:61', law_code: 'LFT', article_number: 'Artículo 61', content: 'La duración máxima de la jornada será: ocho horas la diurna.' }],
  }),
}));

vi.mock('../lib/byok-client', async () => {
  const actual = await vi.importActual<typeof import('../lib/byok-client')>('../lib/byok-client');
  return { ...actual, generateByokText: vi.fn() };
});

vi.mock('../lib/traceability', () => ({
  logLegalExecution: vi.fn(),
}));

import { ipcMain as electronIpcMain } from 'electron';
import { generateByokText } from '../lib/byok-client';
import { getHybridLegalContext } from '../lib/rag';
import { registerDraftHandlers } from './draft.handler';
import { setIpcSenderGuard } from './trusted-ipc';

const MACHOTE = '# CONTRATO INDIVIDUAL DE TRABAJO\n\nDECLARACIONES\n...\n\n[NOMBRE Y FIRMA DEL PATRÓN]';

function draftHandler() {
  setIpcSenderGuard(() => true);
  registerDraftHandlers();
  const registration = (electronIpcMain.handle as unknown as { mock: { calls: Array<[string, (...args: unknown[]) => Promise<{ result: string }>]> } }).mock.calls
    .find(([channel]) => channel === 'ipc:draft');
  expect(registration).toBeDefined();
  return registration![1];
}

describe('ipc:draft con plantilla', () => {
  it('redacta el documento completo desde el machote y deja los fundamentos al final', async () => {
    vi.mocked(generateByokText).mockResolvedValueOnce(JSON.stringify({
      claims: [
        { claimId: 'proemio', heading: 'CONTRATO INDIVIDUAL DE TRABAJO', text: 'Que celebran ACME, S.A. de C.V. y Ana López.', sourceIds: ['user:requirements', 'template:laboral-contrato-individual'] },
        { claimId: 'jornada', heading: 'SEGUNDA. Jornada', text: 'La jornada será de cuarenta y ocho horas semanales.', sourceIds: ['law:lft:61', 'user:requirements'] },
        { claimId: 'firmas', heading: 'FIRMAS', text: '[NOMBRE Y FIRMA DEL PATRÓN]', sourceIds: ['template:laboral-contrato-individual'] },
      ],
    }));

    const response = await draftHandler()({}, {
      requirements: 'DOCUMENTO SOLICITADO: Contrato individual de trabajo\n\nDATOS PROPORCIONADOS:\n- Patrón: ACME, S.A. de C.V.\n- Persona trabajadora: Ana López',
      ecosystem: 'laboral',
      template: {
        id: 'laboral-contrato-individual',
        title: 'Contrato individual de trabajo',
        prompt: 'Contrato por tiempo indeterminado con jornada, salario y prestaciones.',
        body: MACHOTE,
      },
    });

    // Las secciones sin artículo propio (proemio y firmas) ya no provocan una reparación ni se pierden.
    expect(generateByokText).toHaveBeenCalledOnce();
    const request = vi.mocked(generateByokText).mock.calls[0][0];
    expect(request.prompt).toContain('MACHOTE BASE');
    expect(request.prompt).toContain('[NOMBRE Y FIRMA DEL PATRÓN]');
    expect(vi.mocked(getHybridLegalContext).mock.calls[0][0].startsWith('Contrato individual de trabajo')).toBe(true);

    expect(response.result).toContain('## CONTRATO INDIVIDUAL DE TRABAJO\nQue celebran ACME, S.A. de C.V. y Ana López.');
    expect(response.result).toContain('## FIRMAS');
    expect(response.result).toContain('## Fundamentos\n- SEGUNDA. Jornada: LFT Artículo 61');
    expect(response.result).not.toContain('Fuentes vinculadas');
  });
});
