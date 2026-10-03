import React, { useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, Send, X } from 'lucide-react';
import { selectAiReady, useUiStore } from '../../store/useUiStore';
import { BASIC_REVIEW_LIMITS, BASIC_REVIEW_SCOPE } from '../../lib/review';
import { Button, TextInput } from '../ui';
import { cn } from '../../lib/utils';

const SCREEN_HELP: Record<string, { title: string; steps: string[] }> = {
  '/': {
    title: 'Inicio',
    steps: [
      'Elige una tarea: redactar un documento, revisar uno existente o consultar leyes.',
      'En "Continuar" aparece lo último que guardaste en el portafolio.',
      'Si algún componente local requiere atención, se indica en "Estado del sistema".',
    ],
  },
  '/redactar': {
    title: 'Redactar',
    steps: [
      'Paso 1: busca un documento base por nombre o filtra por materia. También puedes partir de tu propio archivo o redactar sin documento base.',
      'Paso 2: completa los datos del formulario. Los campos vacíos se marcan como [DATO FALTANTE] en el borrador.',
      '"Abrir documento sin IA" abre el texto completo para llenarlo a mano. "Redactar con IA" genera el borrador con tu proveedor.',
      'Paso 3: revisa, edita y exporta a PDF o Word. Tras guardarlo, los cambios se guardan solos.',
    ],
  },
  '/revisar': {
    title: 'Revisar',
    steps: [
      'Sube el documento y elige una o varias materias.',
      'Con IA conectada obtienes una revisión con IA validada contra el corpus local; sin IA, una revisión básica.',
      'Desde el resultado puedes redactar una adenda, una cláusula para un hallazgo o exportar el informe.',
    ],
  },
  '/leyes': {
    title: 'Leyes',
    steps: [
      'Escribe de 2 a 4 palabras sobre el tema (por ejemplo "rescisión sin responsabilidad") y, si quieres, limita la materia.',
      'Abre cualquier ley completa en el lector: navega por artículo o busca dentro del texto.',
      'Copia la cita o llévala a Redactar para incluirla en tus instrucciones.',
    ],
  },
  '/portafolio': {
    title: 'Portafolio',
    steps: [
      'Aquí están todos tus documentos y revisiones guardados en este equipo.',
      'Abre un elemento para seguir trabajando, expórtalo o elimínalo.',
      'La conservación se configura en Configuración › Datos y privacidad.',
    ],
  },
  '/configuracion': {
    title: 'Configuración',
    steps: [
      'Inteligencia artificial: conecta o cambia tu proveedor y modelo.',
      'Datos y privacidad: conservación del portafolio, privacidad estricta, respaldo y bitácora.',
      'Acerca de: versión instalada y actualizaciones.',
    ],
  },
};

const FAQ = [
  {
    q: '¿Qué se envía a mi proveedor de IA?',
    a: 'Sólo la instrucción, extractos seleccionados del documento y los artículos recuperados del corpus local. Nunca el archivo original ni el resto del portafolio.',
  },
  {
    q: '¿Dónde se guarda mi información?',
    a: 'En este equipo, en una bóveda cifrada por el sistema operativo. Puedes respaldarla o eliminarla en Configuración.',
  },
  {
    q: '¿Qué hace la revisión básica?',
    a: `${BASIC_REVIEW_SCOPE.join(' ')} ${BASIC_REVIEW_LIMITS}`,
  },
];

interface GuideMessage {
  role: 'user' | 'model';
  text: string;
}

export function HelpPanel() {
  const open = useUiStore((state) => state.helpOpen);
  const setOpen = useUiStore((state) => state.setHelpOpen);
  const aiReady = useUiStore(selectAiReady);
  const requestProcessingSetup = useUiStore((state) => state.requestProcessingSetup);
  const location = useLocation();
  const titleId = useId();
  const [messages, setMessages] = useState<GuideMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const screenKey = Object.keys(SCREEN_HELP).find((path) => path !== '/' && location.pathname.startsWith(path)) ?? '/';
  const screen = SCREEN_HELP[screenKey];

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    
    // Slight delay to ensure the panel has rendered before grabbing focus
    setTimeout(() => {
      const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (firstFocusable ?? panelRef.current)?.focus();
    }, 10);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        last.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === last) {
        first.focus();
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, setOpen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, asking]);

  const ask = async () => {
    const text = question.trim();
    if (!text || asking) return;
    setMessages((current) => [...current, { role: 'user', text }]);
    setQuestion('');
    setAsking(true);
    try {
      const response = await window.lexDesktop.assistant.askInstructivo({ query: text, history: messages.slice(-6) });
      setMessages((current) => [...current, { role: 'model', text: response.result }]);
    } catch (error: any) {
      setMessages((current) => [...current, { role: 'model', text: error?.message || 'No pude responder en este momento.' }]);
    } finally {
      setAsking(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/30" onClick={() => setOpen(false)} aria-hidden="true" />
      <aside ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative flex h-full w-full max-w-md flex-col bg-white shadow-dialog outline-none">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 pt-12">
          <h2 id={titleId} className="text-lg font-semibold text-slate-950">Ayuda</h2>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar ayuda">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="text-sm font-semibold text-slate-950">En esta pantalla: {screen.title}</h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
              {screen.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-950">Preguntas frecuentes</h3>
            <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {FAQ.map((item) => (
                <details key={item.q} className="group px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">{item.q}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-950">Pregunta sobre el uso de la app</h3>
            {!aiReady ? (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p>Las preguntas libres usan tu proveedor de IA.</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => requestProcessingSetup('preguntar a la ayuda')}>Conectar IA</Button>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {messages.map((message, index) => (
                  <p
                    key={index}
                    className={cn(
                      'whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed',
                      message.role === 'user' ? 'ml-8 bg-legal-950 text-white' : 'mr-8 bg-slate-100 text-slate-800',
                    )}
                  >
                    {message.text}
                  </p>
                ))}
                {asking && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Respondiendo…</p>}
                <div ref={endRef} />
              </div>
            )}
          </section>
        </div>

        {aiReady && (
          <form
            className="flex gap-2 border-t border-slate-200 p-4"
            onSubmit={(event) => { event.preventDefault(); void ask(); }}
          >
            <TextInput
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Por ejemplo: ¿cómo exporto a Word?"
              aria-label="Pregunta sobre el uso de la app"
              disabled={asking}
            />
            <Button type="submit" isIconOnly disabled={asking || question.trim().length < 3} aria-label="Enviar pregunta">
              <Send size={16} />
            </Button>
          </form>
        )}
      </aside>
    </div>
  );
}
