import { afterEach, describe, expect, it, vi } from 'vitest';
import { composeLimitedByokPrompt, composeLimitedByokPromptWithDisclosure, generateByokText, normalizeModelName, testByokConnection } from './byok-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockJsonResponse(payload: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => payload,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

type AnthropicBlock = { type: string; [key: string]: any };

// Eventos SSE de Messages para un mensaje final; el JSON de las herramientas llega en dos partes.
function anthropicEvents(message: { stop_reason?: string; content: AnthropicBlock[] }) {
  return [
    { type: 'message_start', message: { id: 'msg_test', type: 'message', role: 'assistant', content: [], stop_reason: null } },
    ...message.content.flatMap((block, index) => {
      if (block.type === 'tool_use') {
        const json = JSON.stringify(block.input);
        const half = Math.ceil(json.length / 2);
        return [
          { type: 'content_block_start', index, content_block: { ...block, input: {} } },
          { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: json.slice(0, half) } },
          { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: json.slice(half) } },
          { type: 'content_block_stop', index },
        ];
      }
      if (block.type === 'text') {
        return [
          { type: 'content_block_start', index, content_block: { type: 'text', text: '' } },
          { type: 'content_block_delta', index, delta: { type: 'text_delta', text: block.text } },
          { type: 'content_block_stop', index },
        ];
      }
      return [
        { type: 'content_block_start', index, content_block: block },
        { type: 'content_block_stop', index },
      ];
    }),
    { type: 'message_delta', delta: { stop_reason: message.stop_reason ?? 'end_turn' }, usage: { output_tokens: 1 } },
    { type: 'message_stop' },
  ];
}

// Responde con un flujo SSE: un evento por lectura, con pausa opcional, o se queda sin enviar más.
function mockAnthropicStream(events: unknown[], options: { delayMs?: number; stallAfterEvents?: boolean } = {}) {
  const encoder = new TextEncoder();
  const fetchMock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
    let index = 0;
    return {
      ok: true,
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          init.signal?.addEventListener('abort', () => {
            try {
              controller.error(new DOMException('This operation was aborted', 'AbortError'));
            } catch {
              // El flujo ya estaba cerrado.
            }
          });
        },
        async pull(controller) {
          if (index >= events.length) {
            if (options.stallAfterEvents) return new Promise<void>(() => {});
            controller.close();
            return;
          }
          if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
          const event = events[index++] as { type: string };
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
        },
      }),
    };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('BYOK provider client', () => {
  it('calls Gemini generateContent without placing the key in the URL', async () => {
    const fetchMock = mockJsonResponse({ candidates: [{ content: { parts: [{ text: 'gemini-result' }] } }] });
    const result = await generateByokText({ provider: 'gemini', apiKey: 'gemini-secret', model: 'gemini-test', prompt: 'consulta' });

    expect(result).toBe('gemini-result');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).not.toContain('gemini-secret');
    expect(init.headers['x-goog-api-key']).toBe('gemini-secret');
  });

  it('calls OpenAI Responses with storage disabled and a strict JSON schema', async () => {
    const fetchMock = mockJsonResponse({ output_text: '{"ok":true}' });
    await generateByokText({
      provider: 'openai',
      apiKey: 'openai-secret',
      model: 'gpt-test',
      prompt: 'consulta',
      jsonSchema: { name: 'result', schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false } },
    });

    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(init.headers.Authorization).toBe('Bearer openai-secret');
    expect(body.store).toBe(false);
    expect(body.text.format).toMatchObject({ type: 'json_schema', strict: true, name: 'result' });
  });

  it('uses an Anthropic tool schema to obtain structured output', async () => {
    const fetchMock = mockAnthropicStream(anthropicEvents({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'toolu_test', name: 'result', input: { ok: true } }] }));
    const result = await generateByokText({
      provider: 'anthropic',
      apiKey: 'anthropic-secret',
      model: 'claude-test',
      prompt: 'consulta',
      jsonSchema: { name: 'result', schema: { type: 'object', properties: { ok: { type: 'boolean' } } } },
    });

    expect(result).toBe('{"ok":true}');
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(init.headers['x-api-key']).toBe('anthropic-secret');
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'result' });
    expect(body.stream).toBe(true);
  });

  it('keeps reading a long Anthropic response while data keeps arriving', async () => {
    const answer = 'Respuesta larga que llega por partes';
    const events = [
      { type: 'message_start', message: { id: 'msg_test', type: 'message', role: 'assistant', content: [], stop_reason: null } },
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      ...answer.split(' ').map((word, position) => ({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: position === 0 ? word : ` ${word}` } })),
      { type: 'ping' },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 7 } },
      { type: 'message_stop' },
    ];
    // 12 eventos cada 40 ms: casi medio segundo en total con un límite de 150 ms entre datos.
    mockAnthropicStream(events, { delayMs: 40 });

    const result = await generateByokText({ provider: 'anthropic', apiKey: 'anthropic-secret', model: 'claude-sonnet-4-6', prompt: 'consulta', timeoutMs: 150 });

    expect(result).toBe(answer);
  });

  it('gives up when Anthropic stops sending data', async () => {
    mockAnthropicStream([
      { type: 'message_start', message: { id: 'msg_test', type: 'message', role: 'assistant', content: [], stop_reason: null } },
    ], { stallAfterEvents: true });

    await expect(generateByokText({ provider: 'anthropic', apiKey: 'anthropic-secret', model: 'claude-sonnet-4-6', prompt: 'consulta', timeoutMs: 100 }))
      .rejects.toThrow(/agotó el tiempo de espera/);
  });

  it('reports an error sent in the middle of an Anthropic response', async () => {
    mockAnthropicStream([
      { type: 'message_start', message: { id: 'msg_test', type: 'message', role: 'assistant', content: [], stop_reason: null } },
      { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } },
    ]);

    await expect(generateByokText({ provider: 'anthropic', apiKey: 'anthropic-secret', model: 'claude-sonnet-4-6', prompt: 'consulta' }))
      .rejects.toThrow(/Anthropic interrumpió la respuesta \(overloaded_error\)/);
  });

  it('rejects an Anthropic response that ends before message_stop', async () => {
    mockAnthropicStream(anthropicEvents({ content: [{ type: 'text', text: 'OK' }] }).slice(0, -2));

    await expect(generateByokText({ provider: 'anthropic', apiKey: 'anthropic-secret', model: 'claude-sonnet-4-6', prompt: 'consulta' }))
      .rejects.toThrow(/antes de terminar/);
  });

  it('omits sampling parameters rejected by Claude Sonnet 5', async () => {
    const fetchMock = mockAnthropicStream(anthropicEvents({ content: [{ type: 'text', text: 'OK' }] }));
    await generateByokText({
      provider: 'anthropic',
      apiKey: 'anthropic-secret',
      model: 'claude-sonnet-5',
      prompt: 'consulta',
      temperature: 0,
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.temperature).toBeUndefined();
  });

  it('requests structured JSON from current Claude models without forced tools or sampling', async () => {
    const fetchMock = mockAnthropicStream(anthropicEvents({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"ok":true}' }] }));
    const result = await generateByokText({
      provider: 'anthropic',
      apiKey: 'anthropic-secret',
      model: 'claude-opus-5',
      prompt: 'consulta',
      temperature: 0.05,
      maxOutputTokens: 12_000,
      jsonSchema: {
        name: 'result',
        schema: { type: 'object', additionalProperties: false, properties: { score: { type: 'number', minimum: 0, maximum: 100 } } },
      },
    });

    expect(result).toBe('{"ok":true}');
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.temperature).toBeUndefined();
    expect(body.tool_choice).toBeUndefined();
    expect(body.max_tokens).toBe(16_000);
    expect(body.output_config.format).toEqual({
      type: 'json_schema',
      schema: { type: 'object', additionalProperties: false, properties: { score: { type: 'number' } } },
    });
    expect(body.fallbacks).toBe('default');
    expect(init.headers['anthropic-beta']).toBe('server-side-fallback-2026-07-01');
  });

  it('reports a Claude safety refusal instead of an empty result', async () => {
    mockAnthropicStream(anthropicEvents({ stop_reason: 'refusal', content: [] }));
    await expect(generateByokText({
      provider: 'anthropic',
      apiKey: 'anthropic-secret',
      model: 'claude-opus-5',
      prompt: 'consulta',
    })).rejects.toThrow(/declinó/);
  });

  it('tests the connection with the configured model, not a fixed one', async () => {
    const fetchMock = mockAnthropicStream(anthropicEvents({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'OK' }] }));
    const result = await testByokConnection({ provider: 'anthropic', apiKey: 'anthropic-secret', model: 'claude-sonnet-5' });

    expect(result.model).toBe('claude-sonnet-5');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('claude-sonnet-5');
    expect(normalizeModelName('anthropic', '')).toBe('claude-sonnet-4-20250514');
  });

  it('truncates document evidence before losing the legal context or output contract', () => {
    const prompt = composeLimitedByokPrompt({
      instruction: 'INSTRUCCION-CONSERVADA',
      evidence: 'E'.repeat(20_000),
      legalContext: 'FUNDAMENTO-CONSERVADO',
      outputContract: 'CONTRATO-CONSERVADO',
      maxChars: 10_000,
    });

    expect(prompt).toContain('INSTRUCCION-CONSERVADA');
    expect(prompt).toContain('FUNDAMENTO-CONSERVADO');
    expect(prompt).toContain('CONTRATO-CONSERVADO');
    expect(prompt).toContain('EVIDENCIA DOCUMENTAL RECORTADA');
  });

  it('migrates retired Gemini 1.x/2.x and Claude 3.x models and strips models/ prefix', () => {
    expect(normalizeModelName('gemini', 'gemini-1.5-flash')).toBe('gemini-3.5-flash-lite');
    expect(normalizeModelName('gemini', 'models/gemini-1.5-flash-latest')).toBe('gemini-3.5-flash-lite');
    expect(normalizeModelName('gemini', 'models/gemini-2.5-flash')).toBe('gemini-3.5-flash-lite');
    expect(normalizeModelName('gemini', 'models/gemini-3.8-flash')).toBe('gemini-3.8-flash');
    expect(normalizeModelName('anthropic', 'claude-3-5-sonnet-20241022')).toBe('claude-sonnet-4-20250514');
    expect(normalizeModelName('anthropic', 'claude-3-opus-20240229')).toBe('claude-sonnet-4-20250514');
    expect(normalizeModelName('anthropic', 'claude-3-haiku-20240307')).toBe('claude-sonnet-4-20250514');
    expect(normalizeModelName('anthropic', 'claude-3-7-sonnet-latest')).toBe('claude-sonnet-4-20250514');
    expect(normalizeModelName('anthropic', 'claude-sonnet-4-6')).toBe('claude-sonnet-4-6');
  });

  it('auto-discovers an available Gemini model via ListModels when the requested model returns 404 or 402', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => '{"error":{"code":404,"message":"models/gemini-custom-old is not found for API version v1beta","status":"NOT_FOUND"}}',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
            { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemma-4-26b-a4b-it', supportedGenerationMethods: ['generateContent'] },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 402,
        text: async () => '{"error":{"code":402,"message":"Your prepayment credits are depleted.","status":"RESOURCE_EXHAUSTED"}}',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'OK' }] } }],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await testByokConnection({
      provider: 'gemini',
      apiKey: 'gemini-secret',
      model: 'gemini-custom-old',
    });

    expect(result).toEqual({
      ok: true,
      provider: 'gemini',
      model: 'gemma-4-26b-a4b-it',
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[1][0]).toBe('https://generativelanguage.googleapis.com/v1beta/models');
    expect(fetchMock.mock.calls[2][0]).toContain('/models/gemini-3.8-flash:generateContent');
    expect(fetchMock.mock.calls[3][0]).toContain('/models/gemma-4-26b-a4b-it:generateContent');
  });

  it('describes exactly which categories are included without claiming files or vault are sent', () => {
    const { prompt, disclosure } = composeLimitedByokPromptWithDisclosure({
      instruction: 'Analiza la operación',
      evidence: 'Extracto seleccionado',
      legalContext: 'CFF Artículo 69-B',
      outputContract: 'Devuelve JSON',
      maxChars: 10_000,
    });

    expect(prompt).toContain('CFF Artículo 69-B');
    expect(disclosure).toMatchObject({
      destination: 'external-provider',
      sendsInstruction: true,
      sendsDocumentEvidence: true,
      sendsLegalFragments: true,
      sendsOutputContract: true,
      sendsOriginalFiles: false,
      sendsVault: false,
    });
    expect(disclosure.characterCounts.composedPrompt).toBe(prompt.length);
  });
});
