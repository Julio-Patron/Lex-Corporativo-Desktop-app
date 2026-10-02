export const DEFAULT_BYOK_MODELS = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-sonnet-4-20250514',
} as const;

export type ByokProvider = keyof typeof DEFAULT_BYOK_MODELS;
