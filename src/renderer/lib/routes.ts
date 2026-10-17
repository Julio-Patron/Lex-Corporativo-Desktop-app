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
    case '/redactar': return '/estudio/generar';
    case '/revisar': return '/estudio/auditar';
    case '/portafolio': return '/estudio/portafolio';
    case '/ingenieria-juridica': {
      const tab = params.get('tab');
      if (tab === 'drafting') return '/estudio/generar';
      if (tab === 'analysis') return '/estudio/auditar';
      if (tab === 'consultation') return '/';
      return '/';
    }
    case '/buscador':
    case '/fundamentador':
      return '/';
    case '/corpus-normativo':
      return '/leyes';
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
