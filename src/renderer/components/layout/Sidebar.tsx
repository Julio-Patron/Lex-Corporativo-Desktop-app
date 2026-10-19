import React, { useState, useSyncExternalStore } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpenCheck,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  FileSignature,
  FolderOpen,
  Home,
  Info,
  Search,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import logoUrl from '../../assets/logo-mark.png';
import { cn } from '../../lib/utils';
import { providerLabel, selectAiReady, useUiStore } from '../../store/useUiStore';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Buscador Normativo', icon: Search, end: true },
  { to: '/estudio', label: 'Estudio Jurídico', icon: BriefcaseBusiness },
  { to: '/leyes', label: 'Corpus Normativo', icon: BookOpenCheck },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];

const ESTUDIO_SUBITEMS = [
  { to: '/estudio/auditar', label: 'Auditar documento', icon: ShieldCheck },
  { to: '/estudio/generar', label: 'Redactor y Plantillas', icon: FileSignature },
  { to: '/estudio/portafolio', label: 'Portafolio', icon: FolderOpen },
] as const;

const compactMedia = window.matchMedia('(max-width: 1023px)');
const subscribeCompact = (onChange: () => void) => {
  compactMedia.addEventListener('change', onChange);
  return () => compactMedia.removeEventListener('change', onChange);
};

const itemClass = (collapsed: boolean) => ({ isActive }: { isActive: boolean }) => cn(
  'group flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-all',
  collapsed && 'justify-center px-0',
  isActive
    ? 'bg-[#162238] text-white ring-1 ring-blue-400/25 shadow-[inset_3px_0_0_0_#3b82f6]'
    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
);

// Menú retráctil automático o fijo según la preferencia del usuario.
export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const setHelpOpen = useUiStore((state) => state.setHelpOpen);
  const setStationCoverOpen = useUiStore((state) => state.setStationCoverOpen);
  const aiReady = useUiStore(selectAiReady);
  const settings = useUiStore((state) => state.settings);
  const requestProcessingSetup = useUiStore((state) => state.requestProcessingSetup);

  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const compact = useSyncExternalStore(subscribeCompact, () => compactMedia.matches);
  const autoHide = sidebarCollapsed || compact;

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const visuallyCollapsed = autoHide && !hovered && !focused;
  const inEstudio = location.pathname.startsWith('/estudio');

  const onBlur = (event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };

  return (
    <div className={cn(
      'relative h-full shrink-0 transition-[width] duration-200 ease-out',
      autoHide ? 'w-[72px]' : 'w-[260px]',
    )}>
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={onBlur}
        className={cn(
          'absolute inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-white/5 bg-legal-rail text-slate-200 transition-[width,box-shadow] duration-200 ease-out',
          visuallyCollapsed ? 'w-[72px]' : 'w-[260px]',
          autoHide && !visuallyCollapsed && 'shadow-2xl',
        )}
      >
        <div className={cn('relative flex h-[84px] shrink-0 items-center gap-3 border-b border-white/5 px-4', visuallyCollapsed && 'justify-center px-0')}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-legal-gold/30 bg-[#11192c] shadow-inner">
            <img src={logoUrl} alt="" className="h-14 w-14 max-w-none shrink-0 object-contain mix-blend-lighten" />
          </div>
          {!visuallyCollapsed && (
            <div className="min-w-0 flex-1 pr-6 animate-fade-in-up">
              <p className="truncate text-[15px] font-bold leading-tight text-white">Lex Corporativo</p>
              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Estación privada
              </p>
              {!compact && (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="window-no-drag absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-[#152035] text-slate-300 transition-colors hover:border-legal-gold/50 hover:text-white"
                  title={sidebarCollapsed ? 'Fijar panel' : 'Ocultar automáticamente'}
                  aria-label={sidebarCollapsed ? 'Fijar panel' : 'Ocultar automáticamente'}
                >
                  {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-3" aria-label="Navegación principal">
          {!visuallyCollapsed && (
            <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400/90">
              Flujo de trabajo
            </p>
          )}
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <React.Fragment key={to}>
              <NavLink to={to} end={end} className={itemClass(visuallyCollapsed)} title={visuallyCollapsed ? label : undefined}>
                {({ isActive }) => (
                  <>
                    <Icon size={18} className={cn('shrink-0 transition-colors', isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200')} aria-hidden="true" />
                    {visuallyCollapsed ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
                  </>
                )}
              </NavLink>

              {to === '/estudio' && !visuallyCollapsed && (
                <div className="ml-4 space-y-1 border-l border-white/10 pl-3 pt-0.5">
                  {ESTUDIO_SUBITEMS.map((sub) => {
                    const subActive = location.pathname === sub.to || (sub.to === '/estudio/auditar' && location.pathname === '/estudio');
                    const SubIcon = sub.icon;
                    return (
                      <button
                        key={sub.to}
                        type="button"
                        onClick={() => navigate(sub.to)}
                        className={cn(
                          'flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs font-semibold transition-colors',
                          subActive
                            ? 'border border-blue-400/25 bg-[#131f33] text-white'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                        )}
                      >
                        <SubIcon size={14} className={cn('shrink-0', subActive ? 'text-blue-400' : 'text-slate-500')} aria-hidden="true" />
                        <span className="truncate">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </React.Fragment>
          ))}
        </nav>

        <div className="space-y-1.5 border-t border-white/5 p-3">
          <button
            type="button"
            onClick={() => (aiReady ? navigate('/configuracion') : requestProcessingSetup('usar las funciones con IA'))}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left text-xs transition-colors',
              visuallyCollapsed && 'justify-center px-0',
              aiReady ? 'text-emerald-300 hover:bg-white/5' : 'text-legal-gold hover:bg-white/5',
            )}
            title={aiReady ? `IA conectada: ${providerLabel(settings?.provider)}` : 'Conectar IA'}
          >
            <span className={cn('h-2 w-2 shrink-0 rounded-full', aiReady ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-legal-gold')} aria-hidden="true" />
            {visuallyCollapsed
              ? <span className="sr-only">{aiReady ? 'IA conectada' : 'Conectar IA'}</span>
              : <span className="truncate font-semibold">{aiReady ? `${providerLabel(settings?.provider)} conectado` : 'Conectar IA'}</span>}
          </button>

          <button type="button" onClick={() => setHelpOpen(true)} className={itemClass(visuallyCollapsed)({ isActive: false })} title={visuallyCollapsed ? 'Info' : undefined}>
            <Info size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
            {visuallyCollapsed ? <span className="sr-only">Info</span> : <span>Info</span>}
          </button>

          {!visuallyCollapsed ? (
            <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-[#0e1628] px-3 py-2.5">
              <button
                type="button"
                onClick={() => navigate('/configuracion')}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#162238] text-xs font-bold text-slate-200">
                  LC
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-white">Estación local</span>
                  <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {inEstudio ? 'Estudio activo' : 'Configuración'}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStationCoverOpen(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-legal-gold"
                title="Abrir portada de la estación"
                aria-label="Abrir portada de la estación"
              >
                <Home size={15} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setStationCoverOpen(true)}
              className={itemClass(true)({ isActive: false })}
              title="Abrir portada de la estación"
              aria-label="Abrir portada de la estación"
            >
              <Home size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
              <span className="sr-only">Portada</span>
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
