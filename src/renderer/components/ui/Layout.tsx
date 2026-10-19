import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LEGAL_AREA_INFO, type LegalArea } from '../../lib/legal-areas';
import { RadioGroup } from './RadioGroup';
import { BrandPlate, BrandWatermark } from '../BrandWatermark';

interface PageProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  width?: 'default' | 'narrow' | 'wide';
  /** El título ya vive en la fila de Estudio. */
  hideTitle?: boolean;
}

// La barra de ventana pertenece a AppShell; cada módulo abre con una cabecera en tarjeta blanca redondeada.
export function Page({ title, description, actions, icon, children, width = 'default', hideTitle = false }: PageProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className={cn('mx-auto space-y-5 px-4 py-5 pb-12 sm:px-6', maxWidth(width))}>
        {!hideTitle && (
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-card">
            <div className="flex min-w-0 items-center gap-3.5">
              {icon ?? <BrandPlate size="small" />}
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-legal-950 sm:text-xl">{title}</h1>
                {description && <div className="mt-0.5 max-w-prose text-xs text-slate-500 sm:text-sm">{description}</div>}
              </div>
            </div>
            {actions && <div className="window-no-drag flex flex-wrap items-center gap-2">{actions}</div>}
          </header>
        )}
        {hideTitle && (description || actions) && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {description ? <div className="max-w-prose text-sm leading-6 text-slate-600">{description}</div> : <span />}
            {actions && <div className="window-no-drag flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function maxWidth(width: PageProps['width']) {
  return width === 'narrow' ? 'max-w-4xl' : width === 'wide' ? 'max-w-7xl' : 'max-w-6xl';
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn('rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card', className)} {...props} />;
}

export function SectionTitle({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-legal-950">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AreaTag({ area, className }: { area: LegalArea; className?: string }) {
  const info = LEGAL_AREA_INFO[area];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', info.tag, className)}>
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
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>{children}</span>;
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
    <div className={cn('flex gap-3 rounded-xl border p-4 text-sm', styles.box, className)} role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, branded = false }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  branded?: boolean;
}) {
  return (
    <div className="relative isolate flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-6 py-12 text-center shadow-card">
      {branded && <BrandWatermark className="-right-12 -bottom-16 -z-10 h-80 w-80" />}
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Icon size={24} />
      </span>
      <p className="mt-3 text-base font-bold text-legal-950">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
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
    <RadioGroup
      label={label}
      value={value}
      onChange={onChange}
      className="inline-flex flex-wrap gap-1.5"
      optionClassName={(selected) => cn(
        'rounded-full border px-4 py-1.5 text-xs font-semibold transition-all sm:text-sm',
        selected
          ? 'border-legal-950 bg-legal-950 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
      )}
      options={options.map((option) => ({
        value: option.value,
        label: <>{option.label}{option.count !== undefined && <span className={cn('ml-1.5 text-xs font-semibold', value === option.value ? 'text-slate-300' : 'text-slate-400')}>({option.count})</span>}</>,
      }))}
    />
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
