import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookOpenCheck,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  FileSignature,
  FolderOpen,
  House,
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
  { to: '/', label: 'Inicio', icon: House, end: true },
  { to: '/redactar', label: 'Redactar', icon: FileSignature },
  { to: '/revisar', label: 'Revisar', icon: ShieldCheck },
  { to: '/leyes', label: 'Leyes', icon: BookOpenCheck },
  { to: '/portafolio', label: 'Portafolio', icon: FolderOpen },
];

function useNarrowWindow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 1023px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)');
    const onChange = (event: MediaQueryListEvent) => setNarrow(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

const itemClass = (collapsed: boolean) => ({ isActive }: { isActive: boolean }) => cn(
  'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors',
  collapsed && 'justify-center px-0',
  isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
);

export function Sidebar() {
  const narrow = useNarrowWindow();
  const collapsedPreference = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const setHelpOpen = useUiStore((state) => state.setHelpOpen);
  const aiReady = useUiStore(selectAiReady);
  const settings = useUiStore((state) => state.settings);
  const requestProcessingSetup = useUiStore((state) => state.requestProcessingSetup);
  const collapsed = narrow || collapsedPreference;

  return (
    <aside className={cn('flex h-full shrink-0 flex-col bg-legal-rail text-slate-200 transition-[width] duration-200', collapsed ? 'w-[72px]' : 'w-[232px]')}>
      <div className={cn('window-drag-region flex h-[72px] items-center gap-3 border-b border-white/5 px-4', collapsed && 'justify-center px-0')}>
        <img src={logoUrl} alt="" className="h-8 w-8 shrink-0 object-contain brightness-200" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">Lex Corporativo</p>
            <p className="text-xs text-slate-500">Estación jurídica local</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegación principal">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={itemClass(collapsed)} title={collapsed ? label : undefined}>
            <Icon size={18} className="shrink-0" aria-hidden="true" />
            {!collapsed && <span>{label}</span>}
            {collapsed && <span className="sr-only">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/5 p-3">
        <button
          type="button"
          onClick={() => (aiReady ? undefined : requestProcessingSetup('usar las funciones con IA'))}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors',
            collapsed && 'justify-center px-0',
            aiReady ? 'cursor-default text-slate-400' : 'text-amber-300 hover:bg-white/5',
          )}
          title={aiReady ? `IA conectada: ${providerLabel(settings?.provider)}` : 'Conectar IA'}
        >
          <span className={cn('h-2 w-2 shrink-0 rounded-full', aiReady ? 'bg-emerald-400' : 'bg-amber-400')} aria-hidden="true" />
          {!collapsed && <span className="truncate font-semibold">{aiReady ? `IA: ${providerLabel(settings?.provider)}` : 'Conectar IA'}</span>}
          {collapsed && <span className="sr-only">{aiReady ? 'IA conectada' : 'Conectar IA'}</span>}
        </button>
        <button type="button" onClick={() => setHelpOpen(true)} className={itemClass(collapsed)({ isActive: false })} title={collapsed ? 'Ayuda' : undefined}>
          <CircleHelp size={18} className="shrink-0" aria-hidden="true" />
          {collapsed ? <span className="sr-only">Ayuda</span> : <span>Ayuda</span>}
        </button>
        <NavLink to="/configuracion" className={itemClass(collapsed)} title={collapsed ? 'Configuración' : undefined}>
          <Settings size={18} className="shrink-0" aria-hidden="true" />
          {collapsed ? <span className="sr-only">Configuración</span> : <span>Configuración</span>}
        </NavLink>
        {!narrow && (
          <button
            type="button"
            onClick={toggleSidebar}
            className={itemClass(collapsed)({ isActive: false })}
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {collapsed ? <ChevronsRight size={18} /> : <><ChevronsLeft size={18} /><span>Contraer</span></>}
          </button>
        )}
      </div>
    </aside>
  );
}
