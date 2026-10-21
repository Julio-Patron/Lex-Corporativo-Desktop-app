import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

// Abre el texto oficial de la ley (Cámara de Diputados o SAT) en el navegador del sistema.
export function OfficialSourceLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex min-h-9 max-w-full shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-950 [&>svg]:shrink-0',
        className,
      )}
    >
      {children}
      <ExternalLink size={14} aria-hidden="true" />
    </a>
  );
}
