import { useEffect, useId, useState } from 'react';
import { ArrowRight, CheckCircle2, KeyRound, MonitorUp } from 'lucide-react';
import logoLockupUrl from '../../assets/logo-lockup-transparent.png';
import { providerLabel, selectAiReady, useUiStore } from '../../store/useUiStore';
import { ApiKeyForm } from '../ai/ApiKeyForm';

const ONBOARDING_KEY = 'lex_onboarding_v3';

function markOnboardingDone() {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'done');
  } catch {
    // Sin almacenamiento local la bienvenida simplemente no se recuerda.
  }
  try {
    sessionStorage.setItem('lex_station_opened', 'done');
  } catch {
    // Ignorar en entornos sin sessionStorage.
  }
}

// Portada de la estación jurídica local (Captura 195146): abre al iniciar o desde el pie del Sidebar.
export function OnboardingDialog() {
  const open = useUiStore((state) => state.stationCoverOpen);
  const setStationCoverOpen = useUiStore((state) => state.setStationCoverOpen);
  const aiReady = useUiStore(selectAiReady);
  const provider = useUiStore((state) => state.settings?.provider);
  const [showKeySetup, setShowKeySetup] = useState(false);
  const titleId = useId();

  const finish = () => {
    markOnboardingDone();
    setShowKeySetup(false);
    setStationCoverOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="app-modal-layer fixed inset-x-0 bottom-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-[#080d1a] px-6 py-8 text-center text-white"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 38%, rgba(30, 58, 95, 0.28) 0%, rgba(197, 160, 89, 0.06) 35%, rgba(8, 13, 26, 0.98) 75%)',
      }}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col items-center animate-fade-in-up">
        <img
          src={logoLockupUrl}
          alt="Lex Corporativo — Sistema de Inteligencia Jurídica"
          draggable={false}
          className="h-44 w-auto max-w-[340px] select-none object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.65)] sm:h-52"
        />
        <h2 id={titleId} className="sr-only">Lex Corporativo — Estación de trabajo jurídica local</h2>

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c5a059]/90 sm:text-xs">
          Estación de trabajo jurídica local
        </p>
        <div className="mt-3 h-px w-20 bg-gradient-to-r from-transparent via-[#c5a059]/50 to-transparent" aria-hidden="true" />

        <div className="mt-8 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={finish}
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#c5a059] px-8 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[#0b1120] shadow-[0_10px_30px_-5px_rgba(197,160,89,0.45)] transition hover:bg-[#d3b06b] focus-visible:outline-[#c5a059]"
          >
            <MonitorUp size={16} aria-hidden="true" />
            <span>Abrir estación</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>

          {/* Alias accesible para automatización y teclado rápido */}
          <button type="button" onClick={finish} className="sr-only">
            Entrar
          </button>

          {aiReady ? (
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300">
              <CheckCircle2 size={14} aria-hidden="true" />
              {providerLabel(provider)} conectado
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setShowKeySetup((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-[#c5a059]"
            >
              <KeyRound size={13} aria-hidden="true" />
              {showKeySetup ? 'Ocultar configuración de API key' : 'Conectar API key propia (opcional)'}
            </button>
          )}
        </div>

        {showKeySetup && !aiReady && (
          <div className="mt-5 w-full rounded-2xl border border-slate-200 bg-white p-5 text-left text-slate-900 shadow-2xl">
            <ApiKeyForm onConnected={finish} />
          </div>
        )}
      </div>
    </div>
  );
}
