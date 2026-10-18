/**
 * Lex Corporativo Desktop - Security Sanitizer
 * Implements strict data scrubbers for logs, local caches, and traceability.
 */

const CREDENTIAL_KEY_PARTS = ['apikey', 'authorization', 'token', 'secret', 'password', 'servicekey', 'credential'];
const BULKY_KEY_PARTS = ['base64', 'filebase64', 'data', 'value'];
const LOCAL_CACHE_KEY_PARTS = ['apikey', 'authorization', 'token', 'secret', 'password', 'servicekey', 'credential'];

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function keyIncludes(key: string, parts: readonly string[]): boolean {
  const normalized = normalizedKey(key);
  return parts.some(part => normalized.includes(part));
}

const KEY_PATTERNS = [
  /AIza[0-9A-Za-z-_]{35}/g,
  /sk-(?:proj-)?[a-zA-Z0-9_-]{20,}/g,
  /xox[baprs]-[0-9a-zA-Z]{10,48}/g,
  /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,
  /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["']?([a-zA-Z0-9_\-\.]{8,})["']?/gi,
];

export function redactApiKeysAndSecrets(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let redacted = text;
  for (const pattern of KEY_PATTERNS) {
    redacted = redacted.replace(pattern, (match, capture) => {
      if (capture) {
        return match.replace(capture, '[REDACTED_SECRET]');
      }
      return '[REDACTED_API_KEY]';
    });
  }
  return redacted;
}

function normalizeForLogs(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return `[Buffer ${value.length}]`;
  if (value instanceof Error) {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    const cause = 'cause' in value ? (value as { cause?: unknown }).cause : undefined;
    return {
      name: value.name,
      message: value.message,
      ...(cause === undefined ? {} : { cause: normalizeForLogs(cause, seen) }),
    };
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    return value.map(item => normalizeForLogs(item, seen));
  }
  if (value && typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = normalizeForLogs(item, seen);
    }
    return out;
  }
  return value;
}

function scrubLogs(value: unknown): unknown {
  if (typeof value === 'string') return redactApiKeysAndSecrets(value);
  if (Array.isArray(value)) return value.map(scrubLogs);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (keyIncludes(key, CREDENTIAL_KEY_PARTS)) {
        out[key] = '[REDACTED_SENSITIVE_LOGS]';
      } else if (typeof item === 'string' && keyIncludes(key, BULKY_KEY_PARTS) && item.length > 30) {
        out[key] = '[REDACTED_SENSITIVE_LOGS]';
      } else {
        out[key] = scrubLogs(item);
      }
    }
    return out;
  }
  return value;
}

export function sanitizeForLogs(data: unknown): any {
  return scrubLogs(normalizeForLogs(data));
}

export function formatForLog(value: unknown): string {
  const clean = sanitizeForLogs(value);
  if (typeof clean === 'string') return clean;
  try {
    return JSON.stringify(clean);
  } catch {
    return '[unserializable]';
  }
}

export function sanitizeForLocalCache(data: any): any {
  if (typeof data !== 'object' || data === null) return data;

  const copy = JSON.parse(JSON.stringify(data));

  const recursiveSanitize = (obj: any) => {
    for (const key in obj) {
      if (
        keyIncludes(key, LOCAL_CACHE_KEY_PARTS) &&
        typeof obj[key] === 'string'
      ) {
        obj[key] = '[REDACTED_LOCAL_CACHE]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        recursiveSanitize(obj[key]);
      }
    }
  };

  recursiveSanitize(copy);
  return copy;
}
