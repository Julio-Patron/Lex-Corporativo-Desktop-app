import { describe, expect, it } from 'vitest';
import { parseSettingsTab, resolveLegacyRoute } from './routes';

describe('legacy routes', () => {
  it('maps the former workspace tabs to the new task screens', () => {
    expect(resolveLegacyRoute('/ingenieria-juridica', '?tab=drafting')).toBe('/redactar');
    expect(resolveLegacyRoute('/ingenieria-juridica', '?tab=analysis')).toBe('/revisar');
    expect(resolveLegacyRoute('/ingenieria-juridica', '')).toBe('/');
  });

  it('merges the search and corpus screens into Leyes', () => {
    expect(resolveLegacyRoute('/buscador')).toBe('/leyes');
    expect(resolveLegacyRoute('/corpus-normativo')).toBe('/leyes?vista=biblioteca');
  });

  it('keeps the requested settings section', () => {
    expect(resolveLegacyRoute('/settings', '?tab=ia')).toBe('/configuracion?tab=ia');
    expect(resolveLegacyRoute('/settings', '?tab=security')).toBe('/configuracion?tab=datos');
    expect(resolveLegacyRoute('/settings', '?tab=preferences')).toBe('/configuracion');
    expect(parseSettingsTab('acerca')).toBe('acerca');
    expect(parseSettingsTab('otra')).toBe('ia');
  });

  it('ignores current routes', () => {
    expect(resolveLegacyRoute('/redactar')).toBeNull();
  });
});
