import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../byok-settings', () => ({
  getActiveByokConfig: vi.fn(),
}));

vi.mock('../byok-client', () => ({
  generateByokText: vi.fn(),
}));

import { getActiveByokConfig } from '../byok-settings';
import { generateByokText } from '../byok-client';
import { createByokEngine, resolveGenerationEngine } from './generation-engine';

describe('generation-engine', () => {
  beforeEach(() => {
    vi.mocked(getActiveByokConfig).mockReset();
    vi.mocked(generateByokText).mockReset();
  });

  it('no devuelve motor cuando BYOK está desactivado o sin API key', () => {
    vi.mocked(getActiveByokConfig).mockReturnValueOnce({
      enabled: false, provider: 'gemini', model: 'gemini-test', apiKey: 'secret', maxInputChars: 60_000,
    });
    expect(resolveGenerationEngine()).toBeNull();

    vi.mocked(getActiveByokConfig).mockReturnValueOnce({
      enabled: true, provider: 'gemini', model: 'gemini-test', apiKey: null, maxInputChars: 60_000,
    });
    expect(resolveGenerationEngine()).toBeNull();
  });

  it('expone el motor BYOK activo con su etiqueta y presupuesto', () => {
    vi.mocked(getActiveByokConfig).mockReturnValueOnce({
      enabled: true, provider: 'anthropic', model: 'claude-test', apiKey: 'secret', maxInputChars: 42_000,
    });
    const engine = resolveGenerationEngine();
    expect(engine).toMatchObject({
      kind: 'byok',
      provider: 'anthropic',
      model: 'claude-test',
      label: 'anthropic:claude-test',
      maxInputChars: 42_000,
    });
  });

  it('delega la generación en el cliente BYOK con proveedor, llave y modelo', async () => {
    vi.mocked(generateByokText).mockResolvedValueOnce('{"ok":true}');
    const engine = createByokEngine({ provider: 'openai', model: 'gpt-test', apiKey: 'secret', maxInputChars: 60_000 });

    await expect(engine.generate({ prompt: 'consulta', temperature: 0, maxOutputTokens: 100 })).resolves.toBe('{"ok":true}');
    expect(generateByokText).toHaveBeenCalledWith({
      prompt: 'consulta',
      temperature: 0,
      maxOutputTokens: 100,
      provider: 'openai',
      apiKey: 'secret',
      model: 'gpt-test',
    });
  });
});
