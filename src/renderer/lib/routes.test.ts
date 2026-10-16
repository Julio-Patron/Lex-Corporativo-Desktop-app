import { describe, expect, it } from 'vitest';
import { parseSettingsTab, resolveLegacyRoute } from './routes';

describe('legacy routes', () => {
  it('maps the former workspace tabs to the new task screens', () => {
    expect(resolveLegacyRoute('/ingenieria-juridica', '?tab=drafting')).toBe('/estudio/generar');
    expect(resolveLegacyRoute('/ingenieria-juridica', '?tab=analysis')).toBe('/estudio/auditar');
    expect(resolveLegacyRoute('/ingenieria-juridica', '')).toBe('/');
  });

  it('separates article consultation from official law references', () => {
    expect(resolveLegacyRoute('/buscador')).toBe('/fundamentador');
    expect(resolveLegacyRoute('/corpus-normativo')).toBe('/leyes');
  });

  it('preserves saved links to document workflows', () => {
    expect(resolveLegacyRoute('/redactar')).toBe('/estudio/generar');
    expect(resolveLegacyRoute('/revisar')).toBe('/estudio/auditar');
    expect(resolveLegacyRoute('/portafolio')).toBe('/estudio/portafolio');
    expect(resolveLegacyRoute('/ingenieria-juridica', '?tab=consultation')).toBe('/fundamentador');
  });

  it('keeps the requested settings section', () => {
    expect(resolveLegacyRoute('/settings', '?tab=ia')).toBe('/configuracion?tab=ia');
    expect(resolveLegacyRoute('/settings', '?tab=security')).toBe('/configuracion?tab=datos');
    expect(resolveLegacyRoute('/settings', '?tab=preferences')).toBe('/configuracion');
    expect(parseSettingsTab('acerca')).toBe('acerca');
    expect(parseSettingsTab('otra')).toBe('ia');
  });

  it('ignores current routes', () => {
    expect(resolveLegacyRoute('/estudio/generar')).toBeNull();
    expect(resolveLegacyRoute('/fundamentador')).toBeNull();
  });
});
