import React from 'react';
import logoUrl from '../assets/logo-mark.png';
import { cn } from '../lib/utils';

// Conserva el símbolo original; la mezcla elimina visualmente su fondo oscuro
// sobre las superficies claras. Es decorativo y no intercepta interacción.
export function BrandWatermark({ className }: { className?: string }) {
  return <img src={logoUrl} alt="" aria-hidden="true" draggable={false} className={cn('brand-watermark pointer-events-none absolute select-none object-contain', className)} />;
}

const PLATE = {
  hero: { box: 'h-32 w-32 rounded-3xl', mark: 'h-44 w-44' },
  small: { box: 'h-10 w-10 rounded-lg', mark: 'h-14 w-14' },
} as const;

// El emblema de oro sobre su placa negra. El recorte quita el margen oscuro del archivo.
export function BrandPlate({ size = 'hero', className }: { size?: keyof typeof PLATE; className?: string }) {
  const plate = PLATE[size];
  return (
    <div className={cn('flex shrink-0 items-center justify-center overflow-hidden bg-legal-950 shadow-[0_22px_40px_-28px_rgba(28,25,21,0.9)]', plate.box, className)}>
      <img src={logoUrl} alt="" draggable={false} className={cn('max-w-none object-contain mix-blend-lighten', plate.mark)} />
    </div>
  );
}
