import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LEGAL_AREA_INFO, type LegalArea } from '../../lib/legal-areas';

interface PageProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  width?: 'default' | 'narrow' | 'wide';
}

// Estructura común de cada pantalla: la cabecera sirve también como zona de
// arrastre de la ventana (barra de título oculta de Electron).
export function Page({ title, description, actions, children, width = 'default' }: PageProps) {
  return (
    <div className="h-full overflow-y-auto">
      <header className="window-drag-region sticky top-0 z-30 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
        <div className={cn('mx-auto flex min-h-[72px] flex-wrap items-center justify-between gap-3 px-6 py-3 pr-40', maxWidth(width))}>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-950">{title}</h1>
            {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
          </div>
          {actions && <div className="window-no-drag flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </header>
      <div className={cn('mx-auto space-y-6 px-6 py-6 pb-16', maxWidth(width))}>{children}</div>
    </div>
  );
}

function maxWidth(width: PageProps['width']) {
  return width === 'narrow' ? 'max-w-3xl' : width === 'wide' ? 'max-w-7xl' : 'max-w-6xl';
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-card', className)} {...props} />;
}

export function SectionTitle({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AreaTag({ area, className }: { area: LegalArea; className?: string }) {
  const info = LEGAL_AREA_INFO[area];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold', info.tag, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', info.dot)} aria-hidden="true" />
      {info.shortLabel}
    </span>
  );
}

export function Badge({ children, tone = 'neutral', className }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'; className?: string }) {
  const tones = {
    neutral: 'border-slate-200 bg-slate-100 text-slate-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold', tones[tone], className)}>{children}</span>;
}

export function Callout({ tone = 'info', title, children, action, className }: {
  tone?: 'info' | 'warning' | 'success' | 'danger';
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const styles = {
    info: { box: 'border-blue-200 bg-blue-50 text-blue-950', icon: Info },
    warning: { box: 'border-amber-200 bg-amber-50 text-amber-950', icon: AlertTriangle },
    success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-950', icon: CheckCircle2 },
    danger: { box: 'border-red-200 bg-red-50 text-red-950', icon: XCircle },
  }[tone];
  const Icon = styles.icon;
  return (
    <div className={cn('flex gap-3 rounded-lg border p-4 text-sm', styles.box, className)} role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <Icon size={28} className="text-slate-400" />
      <p className="mt-3 text-base font-semibold text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: Array<{ value: NoInfer<T>; label: string; count?: number }>;
  onChange: (value: NoInfer<T>) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
            value === option.value ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950',
          )}
        >
          {option.label}
          {option.count !== undefined && <span className="ml-1.5 text-xs font-medium text-slate-500">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-slate-600" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-legal-gold border-t-transparent" aria-hidden="true" />
      {label && <span>{label}</span>}
    </div>
  );
}
