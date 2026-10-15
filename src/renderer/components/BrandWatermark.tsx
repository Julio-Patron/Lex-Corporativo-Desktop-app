import React from 'react';
import logoUrl from '../assets/logo-mark.png';
import { cn } from '../lib/utils';

// Conserva el símbolo original; la mezcla elimina visualmente su fondo oscuro
// sobre las superficies claras. Es decorativo y no intercepta interacción.
export function BrandWatermark({ className }: { className?: string }) {
  return <img src={logoUrl} alt="" aria-hidden="true" draggable={false} className={cn('brand-watermark pointer-events-none absolute select-none object-contain', className)} />;
}
