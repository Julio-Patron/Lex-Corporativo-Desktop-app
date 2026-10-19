import { z } from 'zod';
import type { DraftRecord, DraftSource } from '../renderer/types';
import type { LegalArea } from '../preload/types';

// Evita que Zod v4 ejecute `new Function("")` para detectar JIT en el renderer bajo CSP estricta.
z.config({ jitless: true });

export const RECOVERY_MAX_CHARS = 8_000_000;
export const RECOVERY_ERROR = 'No se pudo conservar la copia de recuperación. Guarda o exporta el documento antes de salir y vuelve a intentarlo.';

export interface DraftRecovery {
  version: 1;
  step: 'choose' | 'details' | 'document';
  source: DraftSource;
  area: LegalArea;
  templateId: string | null;
  fieldValues: Record<string, string>;
  instructions: string;
  referenceFileName: string | null;
  sourceReview: { id: string; caseId?: string; title: string } | null;
  record: DraftRecord | null;
  dirty: boolean;
}

const area = z.enum(['mercantil', 'laboral', 'comercio_exterior', 'aduanal', 'fiscal']);
const source = z.enum(['template', 'file', 'free', 'review']);
const text = z.string().max(RECOVERY_MAX_CHARS);
const id = z.string().min(1).max(260);
export const DraftRecoverySchema = z.object({
  version: z.literal(1),
  step: z.enum(['choose', 'details', 'document']),
  source, area,
  templateId: id.nullable(),
  fieldValues: z.record(z.string().max(260), text),
  instructions: text,
  referenceFileName: z.string().max(260).nullable(),
  sourceReview: z.object({ id, caseId: id.optional(), title: text }).strict().nullable(),
  record: z.object({
    id, caseId: id.optional(), title: text, area,
    timestamp: z.string().datetime(), updatedAt: z.string().datetime(), source,
    templateId: id.optional(), referenceFileName: z.string().max(260).optional(), sourceReviewId: id.optional(),
    instructions: text, document: text,
    generatedWith: z.enum(['ai', 'template', 'manual']),
    provider: z.enum(['gemini', 'openai', 'anthropic']).optional(),
  }).strict().nullable(),
  dirty: z.boolean(),
}).strict().refine((value) => value.step !== 'document' || value.record !== null);

export interface RecoveryWrite {
  sessionId: string;
  revision: number;
  snapshot: DraftRecovery | null;
}

export type RecoveryResult = { ok: true } | { ok: false; message: string };
export interface RecoveryAPI {
  load: () => Promise<{ sessionId: string; snapshot: DraftRecovery | null; error?: string }>;
  save: (request: RecoveryWrite) => Promise<RecoveryResult>;
  flush: (request: RecoveryWrite) => RecoveryResult;
}
