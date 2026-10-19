import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { FileSignature, FolderOpen, ShieldCheck, Sparkles } from 'lucide-react';
import { BrandPlate } from '../../components/BrandWatermark';
import { Badge } from '../../components/ui';
import { useAiGuard } from '../../hooks/useAiGuard';
import { listPortfolio } from '../../lib/portfolio';
import { cn } from '../../lib/utils';
import { providerLabel, useUiStore } from '../../store/useUiStore';

const SECTIONS = [
  { to: 'auditar', label: 'Auditar', icon: ShieldCheck },
  { to: 'generar', label: 'Generar', icon: FileSignature },
  { to: 'portafolio', label: 'Portafolio', icon: FolderOpen },
];

export default function EstudioLayout() {
  const { pathname } = useLocation();
  const provider = useUiStore((state) => state.settings?.provider);
  const { aiReady } = useAiGuard();
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    let active = true;
    listPortfolio()
      .then((data) => {
        if (active) setSavedCount(data.items.length);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [pathname]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mx-auto w-full max-w-7xl shrink-0 space-y-3 px-4 pt-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-card">
          <div className="flex min-w-0 items-center gap-3.5">
            <BrandPlate size="small" />
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight text-legal-950 sm:text-xl">Estudio Jurídico</p>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                Revisión de riesgos, redacción asistida y portafolio local
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral" className="gap-1.5 px-3 py-1">
              <FolderOpen size={13} className="text-slate-500" aria-hidden="true" />
              Guardados ({savedCount})
            </Badge>
            <Badge tone={aiReady ? 'success' : 'neutral'} className="gap-1.5 px-3 py-1">
              <Sparkles size={13} aria-hidden="true" />
              {aiReady ? `${providerLabel(provider)} conectado` : 'Modo local'}
            </Badge>
          </div>
        </div>

        <nav
          aria-label="Secciones del Estudio"
          className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-card"
        >
          {SECTIONS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 transition-all',
                isActive
                  ? 'bg-legal-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-legal-950',
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-legal-gold' : 'text-slate-400'} aria-hidden="true" />
                  {isActive
                    ? <h1 className="text-sm font-semibold leading-none">{label}</h1>
                    : <span className="text-sm font-semibold leading-none">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="min-h-0 flex-1"><Outlet /></div>
    </div>
  );
}

