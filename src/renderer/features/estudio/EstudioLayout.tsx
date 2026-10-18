import { NavLink, Outlet } from 'react-router-dom';
import { FileSignature, FolderOpen, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

const SECTIONS = [
  { to: 'auditar', label: 'Auditar', icon: ShieldCheck },
  { to: 'generar', label: 'Generar', icon: FileSignature },
  { to: 'portafolio', label: 'Portafolio', icon: FolderOpen },
];

export default function EstudioLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav aria-label="Secciones del Estudio" className="flex shrink-0 flex-wrap items-end gap-x-8 gap-y-1 border-b border-slate-200 bg-legal-paper px-4 sm:px-6">
        {SECTIONS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn(
            '-mb-px inline-flex items-center gap-2 border-b-2 px-1 py-3',
            isActive ? 'border-legal-gold text-legal-950' : 'border-transparent text-slate-500 hover:text-legal-950',
          )}>
            {({ isActive }) => (
              <>
                <Icon size={18} aria-hidden="true" />
                {isActive
                  ? <h1 className="font-serif text-2xl font-medium leading-none">{label}</h1>
                  : <span className="font-serif text-2xl font-medium leading-none">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="min-h-0 flex-1"><Outlet /></div>
    </div>
  );
}
