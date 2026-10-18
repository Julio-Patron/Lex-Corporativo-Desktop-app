import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONTENT_SECURITY_POLICY_HEADER,
  CONTENT_SECURITY_POLICY_META,
  withContentSecurityPolicy,
} from './content-security-policy';

describe('política de contenido', () => {
  it('deja en la meta sólo directivas que Chromium aplica y reserva frame-ancestors al encabezado', () => {
    const html = readFileSync(path.join(process.cwd(), 'src/renderer/index.html'), 'utf8');

    expect(html).toContain(CONTENT_SECURITY_POLICY_META);
    expect(html).not.toContain('frame-ancestors');
    expect(html).not.toContain('report-uri');
    expect(CONTENT_SECURITY_POLICY_META).toContain("frame-src 'none'");
    expect(CONTENT_SECURITY_POLICY_META).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY_HEADER).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY_HEADER).toContain("frame-src 'none'");
  });

  it('sustituye una CSP previa y conserva el resto de encabezados', () => {
    const headers = withContentSecurityPolicy({
      'Content-Type': ['text/html'],
      'content-security-policy': ["default-src *"],
    });

    expect(headers['Content-Type']).toEqual(['text/html']);
    expect(headers['Content-Security-Policy']).toEqual([CONTENT_SECURITY_POLICY_HEADER]);
    expect(headers['content-security-policy']).toBeUndefined();
  });
});
