import { generateByokText, type ByokJsonSchema } from '../byok-client';
import { getActiveByokConfig, type ByokProvider } from '../byok-settings';

/**
 * Solicitud de generación independiente del motor. Los handlers construyen el
 * prompt y el contrato de salida; el motor sólo decide cómo ejecutarlo.
 */
export interface GenerationRequest {
  systemInstruction?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  jsonSchema?: ByokJsonSchema;
}

interface GenerationEngineBase {
  model: string;
  // Identificador para la bitácora de trazabilidad (p. ej. "gemini:gemini-1.5-flash").
  label: string;
  // Presupuesto de entrada que composeLimitedByokPrompt debe respetar.
  maxInputChars: number;
  generate(request: GenerationRequest): Promise<string>;
}

export interface ByokGenerationEngine extends GenerationEngineBase {
  kind: 'byok';
  provider: ByokProvider;
}

export type GenerationEngine = ByokGenerationEngine;

export function createByokEngine(config: {
  provider: ByokProvider;
  model: string;
  apiKey: string;
  maxInputChars: number;
}): ByokGenerationEngine {
  return {
    kind: 'byok',
    provider: config.provider,
    model: config.model,
    label: `${config.provider}:${config.model}`,
    maxInputChars: config.maxInputChars,
    generate: (request) => generateByokText({
      ...request,
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
    }),
  };
}

/**
 * Devuelve el motor generativo activo o null si no hay ninguno disponible.
 * Con null, cada handler aplica su propia degradación (reglas locales, error).
 */
export function resolveGenerationEngine(): GenerationEngine | null {
  const byok = getActiveByokConfig();
  if (!byok.enabled || !byok.apiKey) return null;
  return createByokEngine({
    provider: byok.provider,
    model: byok.model,
    apiKey: byok.apiKey,
    maxInputChars: byok.maxInputChars,
  });
}
