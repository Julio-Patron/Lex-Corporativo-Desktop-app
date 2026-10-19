export const DEFAULT_BYOK_MODELS = {
  gemini: 'gemini-3.5-flash-lite',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-20250514',
} as const;

export type ByokProvider = keyof typeof DEFAULT_BYOK_MODELS;

