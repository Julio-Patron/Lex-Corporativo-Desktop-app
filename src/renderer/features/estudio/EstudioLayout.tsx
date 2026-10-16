import React from 'react';
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
      <nav aria-label="Secciones del Estudio" className="flex shrink-0 flex-wrap gap-1 border-b border-slate-200 bg-white px-4 py-2 sm:px-6">
        {SECTIONS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn(
            'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold',
            isActive ? 'bg-legal-950 text-white' : 'text-slate-600 hover:bg-slate-100',
          )}>
            <Icon size={16} aria-hidden="true" />{label}
          </NavLink>
        ))}
      </nav>
      <div className="min-h-0 flex-1"><Outlet /></div>
    </div>
  );
}
