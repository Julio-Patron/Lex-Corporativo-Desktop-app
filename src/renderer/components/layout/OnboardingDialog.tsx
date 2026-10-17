import React, { useId, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { BrandPlate } from '../BrandWatermark';
import { providerLabel, selectAiReady, useUiStore } from '../../store/useUiStore';
import { ApiKeyForm } from '../ai/ApiKeyForm';
import { Button, Modal } from '../ui';

const ONBOARDING_KEY = 'lex_onboarding_v3';

function shouldShowOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) !== 'done';
  } catch {
    return false;
  }
}

function markOnboardingDone() {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'done');
  } catch {
    // Sin almacenamiento local la bienvenida simplemente no se recuerda.
  }
}

// Primer arranque: el emblema y la opción de conectar la API. La consulta local no la exige.
export function OnboardingDialog() {
  const [open, setOpen] = useState(shouldShowOnboarding);
  const aiReady = useUiStore(selectAiReady);
  const provider = useUiStore((state) => state.settings?.provider);
  const titleId = useId();

  const finish = () => {
    markOnboardingDone();
    setOpen(false);
  };

  return (
    <Modal isOpen={open} onClose={finish} labelledBy={titleId} className="flex max-h-full max-w-xl flex-col overflow-hidden p-0">
      <div className="shrink-0 bg-legal-950 px-8 pb-6 pt-7 text-center">
        <BrandPlate className="mx-auto shadow-none" />
        <h2 id={titleId} className="mt-3 font-serif text-2xl font-medium leading-tight text-legal-gold">Lex Corporativo</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <p className="text-[15px] leading-6 text-slate-600">
          El buscador normativo consulta las leyes de este equipo. Para redactar con IA y obtener la auditoría completa, integra tu API key de Gemini, OpenAI o Anthropic.
        </p>
        <div className="mt-4">
          {aiReady ? (
            <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
              <CheckCircle2 size={18} aria-hidden="true" /> {providerLabel(provider)} está conectado.
            </p>
          ) : (
            <ApiKeyForm onConnected={finish} />
          )}
        </div>
        <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
          <Button onClick={finish}>Entrar</Button>
        </div>
      </div>
    </Modal>
  );
}
