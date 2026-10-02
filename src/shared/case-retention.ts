// Días sin actividad tras los cuales un asunto del portafolio se elimina.
// 0 significa conservación indefinida hasta que la persona usuaria lo borre.
export const CASE_RETENTION_OPTIONS = [0, 30, 90] as const;
export type CaseRetentionDays = typeof CASE_RETENTION_OPTIONS[number];
export const DEFAULT_CASE_RETENTION_DAYS: CaseRetentionDays = 0;

export const CASE_RETENTION_LABELS: Record<CaseRetentionDays, string> = {
  0: 'Conservar hasta que yo los elimine',
  30: 'Eliminar tras 30 días sin actividad',
  90: 'Eliminar tras 90 días sin actividad',
};

export function normalizeCaseRetentionDays(value: unknown): CaseRetentionDays {
  return CASE_RETENTION_OPTIONS.includes(value as CaseRetentionDays)
    ? value as CaseRetentionDays
    : DEFAULT_CASE_RETENTION_DAYS;
}

export function computeCaseRetentionUntil(lastActivity: Date | string, days: CaseRetentionDays): string | null {
  if (days === 0) return null;
  const base = new Date(lastActivity);
  if (Number.isNaN(base.getTime())) return null;
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}
