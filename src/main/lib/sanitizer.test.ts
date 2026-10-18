import { describe, expect, it } from 'vitest';
import { formatForLog, sanitizeForLocalCache, sanitizeForLogs } from './sanitizer';

describe('sanitizeForLogs', () => {
  it('redacta el fixture de la auditoría de datos sin depender de la longitud', () => {
    const redacted = sanitizeForLogs({
      token: 'fixture-short',
      authorization: 'Bearer fixture-secret',
      message: 'token=fixture-secret',
    }) as { token: string; authorization: string; message: string };

    expect(redacted.token).toBe('[REDACTED_SENSITIVE_LOGS]');
    expect(redacted.authorization).not.toContain('fixture-secret');
    expect(redacted.message).not.toContain('fixture-secret');
  });

  it('redacta secretos dentro de un Error y de su causa, sin volcar el stack', () => {
    const error = new Error('token=fixture-secret');
    (error as Error & { cause?: unknown }).cause = { token: 'ab', detail: 'sin secreto' };

    const redacted = sanitizeForLogs(error) as {
      name: string;
      message: string;
      stack?: string;
      cause: { token: string; detail: string };
    };

    expect(redacted.name).toBe('Error');
    expect(redacted.message).not.toContain('fixture-secret');
    expect(redacted.stack).toBeUndefined();
    expect(redacted.cause.token).toBe('[REDACTED_SENSITIVE_LOGS]');
    expect(redacted.cause.detail).toBe('sin secreto');
    expect(formatForLog(error)).not.toContain('fixture-secret');
    expect(formatForLog(error)).not.toContain('ab');
  });

  it('conserva un dato corto que no es credencial y redacta el bloque largo', () => {
    const redacted = sanitizeForLogs({
      data: 'visible',
      value: 'x'.repeat(31),
    }) as { data: string; value: string };

    expect(redacted.data).toBe('visible');
    expect(redacted.value).toBe('[REDACTED_SENSITIVE_LOGS]');
  });
});

describe('sanitizeForLocalCache', () => {
  it('redacta authorization aunque el valor sea corto', () => {
    const redacted = sanitizeForLocalCache({ authorization: 'Bearer ab', note: 'visible' });
    expect(redacted.authorization).toBe('[REDACTED_LOCAL_CACHE]');
    expect(redacted.note).toBe('visible');
  });
});
