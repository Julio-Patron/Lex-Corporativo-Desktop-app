import { useId } from 'react';
import { cn } from '../lib/utils';

// Logotipo oficial en vector (isotipo, nombre y leyenda), el mismo del sitio web.
// Sustituye a logo-lockup-transparent.png, cuya leyenda rasterizada no lleva acento.
export function BrandLockup({ className }: { className?: string }) {
  // useId puede incluir caracteres que no sirven en una referencia url(#…) de SVG.
  const gradientId = `lex-oro-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg viewBox="0 0 240 160" className="h-auto w-36 sm:w-44" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="14" y1="14" x2="226" y2="146" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#D8B774" />
            <stop offset="50%" stopColor="#C5A059" />
            <stop offset="100%" stopColor="#9A7836" />
          </linearGradient>
        </defs>
        <g fill={`url(#${gradientId})`}>
          <rect x="113" y="14" width="14" height="38" rx="1" />
          <path d="M14 62H226L214 74H127V146H113V74H26L14 62Z" />
          <path d="M38 86H102L91 97H49L38 86Z" />
          <path d="M138 86H202L191 97H149L138 86Z" />
        </g>
      </svg>
      <p className="mt-4 font-serif text-4xl font-semibold tracking-[0.02em] text-white sm:text-[2.75rem]">Lex Corporativo</p>
      <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-legal-gold sm:text-sm">Sistema de inteligencia jurídica</p>
    </div>
  );
}
