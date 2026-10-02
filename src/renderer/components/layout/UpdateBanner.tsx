import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useUiStore } from '../../store/useUiStore';
import { Button } from '../ui';

// Aviso de actualización dentro de la app: la descarga la gestiona electron-updater.
export function UpdateBanner() {
  const update = useUiStore((state) => state.update);
  if (update.status === 'idle') return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-200 bg-blue-50 px-6 py-2.5 text-sm text-blue-950" role="status">
      {update.status === 'available' ? (
        <p className="flex items-center gap-2">
          <Download size={16} aria-hidden="true" />
          Descargando la versión {update.version}…
        </p>
      ) : (
        <>
          <p className="flex items-center gap-2">
            <RefreshCw size={16} aria-hidden="true" />
            Hay una actualización lista{update.version ? ` (versión ${update.version})` : ''}. Se instalará al reiniciar.
          </p>
          <Button size="sm" onClick={() => window.lexDesktop.settings.installUpdate()}>Reiniciar y actualizar</Button>
        </>
      )}
    </div>
  );
}
