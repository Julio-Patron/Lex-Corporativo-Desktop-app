import { useId, useState } from 'react';
import { ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import { providerLabel, selectAiReady, useUiStore } from '../../store/useUiStore';
import { ApiKeyForm } from '../ai/ApiKeyForm';
import { BrandLockup } from '../BrandLockup';
import { Modal } from '../ui/Modal';

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

function isTypingInField() {
  const active = document.activeElement;
  return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement;
}

// Bienvenida: abre al iniciar o desde el pie de la barra lateral. Usa el diálogo
// compartido (foco inicial, fondo inerte y Escape) a pantalla completa.
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

  // Escape no cierra mientras se escribe la clave; fuera de un campo, primero pliega
  // el formulario de la clave y después cierra la bienvenida.
  const close = () => {
    if (isTypingInField()) return;
    if (showKeySetup) setShowKeySetup(false);
    else finish();
  };

  return (
    <Modal isOpen={open} onClose={close} labelledBy={titleId} placement="cover" className="bg-[#080d1a] text-white shadow-none">
      <div
        className="flex min-h-full flex-col items-center justify-center px-6 py-8 text-center"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 38%, rgba(30, 58, 95, 0.28) 0%, rgba(197, 160, 89, 0.06) 35%, rgba(8, 13, 26, 0.98) 75%)',
        }}
      >
        <div className="mx-auto flex w-full max-w-lg flex-col items-center animate-fade-in-up">
          <BrandLockup />
          <h2 id={titleId} className="sr-only">Bienvenida a Lex Corporativo</h2>

          <p className="mt-6 max-w-sm text-sm leading-relaxed text-slate-300">
            Consulta leyes, revisa documentos y redacta contratos desde tu computadora.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={finish}
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#c5a059] px-8 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[#0b1120] shadow-[0_10px_30px_-5px_rgba(197,160,89,0.45)] transition hover:bg-[#d3b06b] focus-visible:outline-[#c5a059]"
            >
              <span>Entrar</span>
              <ArrowRight size={16} aria-hidden="true" />
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
                aria-expanded={showKeySetup}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-[#c5a059]"
              >
                <KeyRound size={13} aria-hidden="true" />
                {showKeySetup ? 'Ocultar la conexión de IA' : 'Conectar mi cuenta de IA (opcional)'}
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
    </Modal>
  );
}
