import React, { useId, useState } from 'react';
import { BookOpenCheck, CheckCircle2, FileSignature, Lock, ShieldCheck } from 'lucide-react';
import logoUrl from '../../assets/logo-lockup-transparent.png';
import { providerLabel, selectAiReady, useUiStore } from '../../store/useUiStore';
import { ApiKeyForm } from '../ai/ApiKeyForm';
import { Button, Modal } from '../ui';

const ONBOARDING_KEY = 'lex_onboarding_v2';

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

const TASKS = [
  { icon: FileSignature, title: 'Redactar', text: 'Contratos, actas, poderes y escritos a partir de 48 documentos base en cinco materias.' },
  { icon: ShieldCheck, title: 'Revisar', text: 'Detecta riesgos y omisiones en tus documentos y prepara la adenda que los corrige.' },
  { icon: BookOpenCheck, title: 'Consultar leyes', text: '16 leyes federales instaladas, con búsqueda por tema y lector por artículo.' },
];

// Bienvenida de primer uso: explica qué hace la app y ofrece conectar la IA sin hacerlo obligatorio.
export function OnboardingDialog() {
  const [open, setOpen] = useState(shouldShowOnboarding);
  const [step, setStep] = useState<'welcome' | 'ai'>('welcome');
  const aiReady = useUiStore(selectAiReady);
  const provider = useUiStore((state) => state.settings?.provider);
  const titleId = useId();

  const finish = () => {
    markOnboardingDone();
    setOpen(false);
  };

  return (
    <Modal isOpen={open} onClose={finish} labelledBy={titleId} className="max-w-2xl p-8">
      {step === 'welcome' ? (
        <div>
          <img src={logoUrl} alt="Lex Corporativo" className="mx-auto h-auto w-64" />
          <h2 id={titleId} className="mt-6 text-center text-xl font-semibold text-slate-950">Tu estación jurídica local</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {TASKS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-lg border border-slate-200 p-4">
                <Icon size={20} className="text-legal-golddark" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <Lock size={16} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
            Tus documentos, el portafolio y las leyes se quedan en este equipo. La IA sólo se usa con tu propia API key y recibe el texto necesario para cada operación.
          </p>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setStep('ai')}>Continuar</Button>
          </div>
        </div>
      ) : (
        <div>
          <h2 id={titleId} className="text-xl font-semibold text-slate-950">Conecta tu IA (opcional)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Con una API key de Google Gemini, OpenAI o Anthropic puedes redactar con IA y obtener revisiones completas. Sin ella puedes usar los documentos base, la revisión básica y la consulta de leyes.
          </p>
          <div className="mt-5">
            {aiReady ? (
              <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
                <CheckCircle2 size={18} aria-hidden="true" /> {providerLabel(provider)} está conectado.
              </p>
            ) : (
              <ApiKeyForm />
            )}
          </div>
          <div className="mt-6 flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep('welcome')}>Atrás</Button>
            <Button variant={aiReady ? 'primary' : 'secondary'} onClick={finish}>{aiReady ? 'Empezar' : 'Ahora no'}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
