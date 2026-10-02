export type SettingsTab = 'ia' | 'datos' | 'acerca';

const LEGACY_SETTINGS_TABS: Record<string, SettingsTab> = {
  ia: 'ia',
  data: 'datos',
  security: 'datos',
  legal: 'acerca',
};

// Traduce las rutas de versiones anteriores (menús, accesos guardados) a la navegación actual.
export function resolveLegacyRoute(pathname: string, search = ''): string | null {
  const params = new URLSearchParams(search);
  switch (pathname) {
    case '/ingenieria-juridica': {
      const tab = params.get('tab');
      if (tab === 'drafting') return '/redactar';
      if (tab === 'analysis') return '/revisar';
      if (tab === 'consultation') return '/leyes';
      return '/';
    }
    case '/buscador':
      return '/leyes';
    case '/corpus-normativo':
      return '/leyes?vista=biblioteca';
    case '/settings': {
      const tab = LEGACY_SETTINGS_TABS[params.get('tab') ?? ''];
      return tab ? `/configuracion?tab=${tab}` : '/configuracion';
    }
    case '/privacy':
      return '/privacidad';
    case '/terms':
      return '/terminos';
    case '/documentos':
    case '/corporativo':
    case '/fiscal':
    case '/instructivo':
      return '/';
    default:
      return null;
  }
}

export function parseSettingsTab(value: string | null): SettingsTab {
  return value === 'datos' || value === 'acerca' ? value : 'ia';
}
