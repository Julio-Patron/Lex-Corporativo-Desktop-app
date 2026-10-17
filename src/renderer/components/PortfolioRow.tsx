import React from 'react';
import { FileSignature, ShieldCheck } from 'lucide-react';
import type { PortfolioItem } from '../types';
import { portfolioItemDate } from '../lib/portfolio';
import { AreaTag, Badge } from './ui';

export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function portfolioItemTitle(item: PortfolioItem): string {
  return item.record.title;
}

// Fila de un documento o una revisión, usada en el Portafolio.
export function PortfolioRowSummary({ item, expiresAt }: { item: PortfolioItem; expiresAt?: string | null }) {
  const isDraft = item.kind === 'draft';
  const areas = isDraft ? [item.record.area] : item.record.areas;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-legal-paper text-legal-950 ring-1 ring-legal-gold/60">
        {isDraft ? <FileSignature size={17} aria-hidden="true" /> : <ShieldCheck size={17} aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[15px] font-medium text-legal-950">{portfolioItemTitle(item)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>{isDraft ? 'Documento' : item.record.reviewMode === 'basic' ? 'Revisión básica' : 'Revisión con IA'}</span>
          <span>{formatDate(portfolioItemDate(item))}</span>
          {areas.length <= 2
            ? areas.map((area) => <AreaTag key={area} area={area} />)
            : <Badge>{areas.length} materias</Badge>}
          {expiresAt && <Badge tone="warning">Se elimina el {formatDate(expiresAt)}</Badge>}
        </div>
      </div>
    </div>
  );
}
