import { describe, expect, it } from 'vitest';
import { computeCaseRetentionUntil, normalizeCaseRetentionDays } from './case-retention';

describe('case retention policy', () => {
  it('keeps activities indefinitely by default', () => {
    expect(normalizeCaseRetentionDays(undefined)).toBe(0);
    expect(normalizeCaseRetentionDays(5)).toBe(0);
    expect(computeCaseRetentionUntil('2026-09-01T00:00:00.000Z', 0)).toBeNull();
  });

  it('expires activities the configured days after their last activity', () => {
    expect(normalizeCaseRetentionDays(30)).toBe(30);
    expect(computeCaseRetentionUntil('2026-09-01T00:00:00.000Z', 30)).toBe('2026-10-01T00:00:00.000Z');
    expect(computeCaseRetentionUntil('2026-09-01T00:00:00.000Z', 90)).toBe('2026-11-30T00:00:00.000Z');
  });

  it('ignores invalid activity dates instead of expiring them immediately', () => {
    expect(computeCaseRetentionUntil('no-date', 30)).toBeNull();
  });
});
