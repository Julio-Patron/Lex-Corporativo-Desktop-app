import { useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ExternalLink, Loader2, Send, X } from 'lucide-react';
import { selectAiReady, useUiStore } from '../../store/useUiStore';
import { BASIC_REVIEW_LIMITS, BASIC_REVIEW_SCOPE } from '../../lib/review';
import { Button, Modal, TextInput } from '../ui';
import { cn } from '../../lib/utils';

const SCREEN_HELP: Record<string, { title: string; steps: string[] }> = {
  '/': { title: 'Buscador normativo', steps: [
    'Elige la materia de la consulta y escribe el tema.',
    'La respuesta recupera artículos del corpus legal integrado. El inventario está en Leyes.',
    'Copia una cita o úsala al generar un documento en el Estudio.',
  ] },
  '/estudio/generar': { title: 'Generar', steps: [
    'Solicita un documento a la IA, parte de un archivo o despliega las plantillas precargadas.',
    'Completa los datos y las instrucciones. También puedes abrir una plantilla para editarla sin IA.',
    'Revisa, edita y exporta a PDF o Word. Tras guardar el documento, los cambios se guardan solos.',
  ] },
  '/estudio/auditar': { title: 'Auditar', steps: [
    'Sube el documento y elige las materias y el alcance de la revisión.',
    'Con IA conectada obtienes una auditoría apoyada en el corpus local; sin IA, una revisión básica de alcance limitado.',
    'Desde el resultado puedes generar una adenda o una cláusula para un hallazgo, o exportar el informe.',
  ] },
  '/leyes': { title: 'Leyes', steps: [
    'El inventario presenta el corpus legal integrado, ordenado por materia.',
    'Abrir articulado muestra el texto íntegro de cada ley dentro de la aplicación, sin conexión.',
    'El enlace a la Cámara de Diputados abre la fuente oficial en tu navegador.',
  ] },
  '/estudio/portafolio': { title: 'Portafolio', steps: [
    'Aquí están los documentos generados e informes de revisión guardados en este equipo.',
    'Abre un elemento para seguir trabajando, expórtalo o elimínalo.',
    'La conservación se configura en Configuración › Datos y privacidad.',
  ] },
  '/configuracion': { title: 'Configuración', steps: [
    'Inteligencia artificial: conecta o cambia tu proveedor y modelo.',
    'Datos y privacidad: conservación del portafolio, privacidad estricta, respaldo y bitácora.',
    'Acerca de: versión instalada y actualizaciones.',
  ] },
};

const KEY_GUIDES = [
  {
    name: 'Gemini',
    href: 'https://aistudio.google.com/apikey',
    where: 'Entra a Google AI Studio con tu cuenta de Google y crea una clave.',
  },
  {
    name: 'OpenAI',
    href: 'https://platform.openai.com/settings/organization/api-keys',
    where: 'Entra a la plataforma de OpenAI, abre las claves de API y crea una.',
  },
  {
    name: 'Anthropic',
    href: 'https://platform.claude.com/settings/keys',
    where: 'Entra a la consola de Claude, abre las claves y crea una.',
  },
];

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

  const screenKey = Object.keys(SCREEN_HELP).find((path) => path !== '/' && location.pathname.startsWith(path)) ?? '/';
  const screen = SCREEN_HELP[screenKey];

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
    <Modal isOpen={open} onClose={() => setOpen(false)} labelledBy={titleId} placement="right">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id={titleId} className="font-serif text-xl font-medium text-legal-950">Info</h2>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar info">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="font-serif text-lg font-medium text-legal-950">La herramienta</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Lex Corporativo es un escritorio para trabajo jurídico mexicano: mercantil y corporativo, laboral, comercio exterior, aduanas y fiscal. Las leyes, la búsqueda y los documentos guardados permanecen en este equipo.
            </p>
          </section>

          <section>
            <h3 className="font-serif text-lg font-medium text-legal-950">Cómo funciona</h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-slate-700">
              <li>Buscador normativo: eliges la materia y escribes el tema. La respuesta son artículos del corpus.</li>
              <li>Auditar: subes un documento. Con IA, el dictamen se contrasta con esos artículos. Sin IA, la revisión sólo detecta menciones y estructura.</li>
              <li>Generar: pides un documento, partes de un archivo o abres una plantilla. Con IA se redacta; sin IA puedes llenar la plantilla a mano.</li>
              <li>Leyes muestra el inventario del corpus y el enlace a la Cámara de Diputados. Portafolio guarda documentos e informes en este equipo.</li>
            </ol>
          </section>

          <section>
            <h3 className="font-serif text-lg font-medium text-legal-950">Activar la IA</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              La redacción y la auditoría con IA usan una clave tuya. El buscador, la revisión básica, las plantillas y el portafolio funcionan sin ella. La clave se guarda cifrada en este equipo y el costo lo cobra el proveedor.
            </p>
            <ul className="mt-3 space-y-3">
              {KEY_GUIDES.map((guide) => (
                <li key={guide.name}>
                  <a href={guide.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-legal-950 underline decoration-legal-gold underline-offset-4">
                    {guide.name}
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                  <p className="mt-0.5 text-sm leading-6 text-slate-600">{guide.where}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-6 text-slate-700">Copia la clave y pégala en Conectar IA, en la barra lateral, o en Configuración.</p>
            {!aiReady && (
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => requestProcessingSetup('activar la IA')}>Conectar IA</Button>
            )}
          </section>

          <section>
            <h3 className="font-serif text-lg font-medium text-legal-950">En esta pantalla: {screen.title}</h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
              {screen.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </section>

          <section>
            <h3 className="font-serif text-lg font-medium text-legal-950">Preguntas frecuentes</h3>
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
            <h3 className="font-serif text-lg font-medium text-legal-950">Pregunta sobre el uso</h3>
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
    </Modal>
  );
}
