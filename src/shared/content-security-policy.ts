/**
 * La meta del documento no puede aplicar frame-ancestors ni report-uri: Chromium las ignora ahí.
 * frame-src y object-src sí bloquean iframes y plugins desde la meta, también en file://.
 * frame-ancestors viaja en el encabezado de respuesta, que el documento http de desarrollo recibe.
 */
export const CONTENT_SECURITY_POLICY_META = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "connect-src 'self' lexcorp:",
  "img-src 'self' data: blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export const CONTENT_SECURITY_POLICY_HEADER = `${CONTENT_SECURITY_POLICY_META}; frame-ancestors 'none'`;

export function withContentSecurityPolicy(
  responseHeaders: Record<string, string[] | string> | undefined,
): Record<string, string[] | string> {
  const headers: Record<string, string[] | string> = { ...(responseHeaders ?? {}) };
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'content-security-policy') delete headers[key];
  }
  headers['Content-Security-Policy'] = [CONTENT_SECURITY_POLICY_HEADER];
  return headers;
}
