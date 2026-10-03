import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookOpenCheck,
  CircleHelp,
  FileSignature,
  FolderOpen,
  House,
  Settings,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
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

const itemClass = (collapsed: boolean) => ({ isActive }: { isActive: boolean }) => cn(
  'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors',
  collapsed && 'justify-center px-0',
  isActive ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_var(--color-legal-gold)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
);

// Menú retráctil automático o fijo según la preferencia del usuario.
export function Sidebar() {
  const setHelpOpen = useUiStore((state) => state.setHelpOpen);
  const aiReady = useUiStore(selectAiReady);
  const settings = useUiStore((state) => state.settings);
  const requestProcessingSetup = useUiStore((state) => state.requestProcessingSetup);
  
  // sidebarCollapsed = true significa que está "oculta/retráctil", false significa que está "fija"
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  
  // Visually collapsed solo si el usuario prefirió que esté oculta Y no tiene el puntero encima
  const visuallyCollapsed = sidebarCollapsed && !hovered && !focused;

  const onBlur = (event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };

  return (
    <div className={cn(
      "relative h-full shrink-0 transition-[width] duration-200 ease-out",
      sidebarCollapsed ? "w-[72px]" : "w-[260px]" // Reserva espacio en el layout solo si está fija
    )}>
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={onBlur}
        className={cn(
          'absolute inset-y-0 left-0 z-40 flex flex-col overflow-hidden bg-legal-950 text-slate-200 transition-[width,box-shadow] duration-200 ease-out',
          visuallyCollapsed ? 'w-[72px]' : 'w-[260px]',
          sidebarCollapsed && !visuallyCollapsed && 'shadow-2xl' // Sombra solo cuando se expande sobre el contenido
        )}
      >
        <div className={cn('window-drag-region flex h-[76px] shrink-0 items-center gap-3 border-b border-white/5 px-4', visuallyCollapsed && 'justify-center px-0')}>
          <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 object-contain brightness-200" />
          {!visuallyCollapsed && (
            <div className="min-w-0 flex-1 flex items-center justify-between animate-fade-in-up pr-2">
              <div className="min-w-0">
                <p className="truncate font-serif text-[15px] font-bold uppercase tracking-wide text-legal-gold">Lex Corporativo</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estación Jurídica</p>
              </div>
              <button 
                onClick={toggleSidebar} 
                className="window-no-drag rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-100 transition-colors shrink-0"
                title={sidebarCollapsed ? "Fijar panel" : "Ocultar automáticamente"}
                aria-label={sidebarCollapsed ? "Fijar panel" : "Ocultar automáticamente"}
              >
                {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3" aria-label="Navegación principal">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={itemClass(visuallyCollapsed)} title={visuallyCollapsed ? label : undefined}>
              <Icon size={18} className="shrink-0" aria-hidden="true" />
              {visuallyCollapsed ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/5 p-3">
          <button
            type="button"
            onClick={() => (aiReady ? undefined : requestProcessingSetup('usar las funciones con IA'))}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors',
              visuallyCollapsed && 'justify-center px-0',
              aiReady ? 'cursor-default text-slate-400' : 'text-legal-gold hover:bg-white/5',
            )}
            title={aiReady ? `IA conectada: ${providerLabel(settings?.provider)}` : 'Conectar IA'}
          >
            <span className={cn('h-2 w-2 shrink-0 rounded-full', aiReady ? 'bg-emerald-400' : 'bg-legal-gold')} aria-hidden="true" />
            {visuallyCollapsed
              ? <span className="sr-only">{aiReady ? 'IA conectada' : 'Conectar IA'}</span>
              : <span className="truncate font-semibold">{aiReady ? `IA: ${providerLabel(settings?.provider)}` : 'Conectar IA'}</span>}
          </button>
          <button type="button" onClick={() => setHelpOpen(true)} className={itemClass(visuallyCollapsed)({ isActive: false })} title={visuallyCollapsed ? 'Ayuda' : undefined}>
            <CircleHelp size={18} className="shrink-0" aria-hidden="true" />
            {visuallyCollapsed ? <span className="sr-only">Ayuda</span> : <span>Ayuda</span>}
          </button>
          <NavLink to="/configuracion" className={itemClass(visuallyCollapsed)} title={visuallyCollapsed ? 'Configuración' : undefined}>
            <Settings size={18} className="shrink-0" aria-hidden="true" />
            {visuallyCollapsed ? <span className="sr-only">Configuración</span> : <span>Configuración</span>}
          </NavLink>
        </div>
      </aside>
    </div>
  );
}
