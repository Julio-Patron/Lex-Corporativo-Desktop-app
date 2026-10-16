import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Callout, Page } from '../../components/ui';
import logoUrl from '../../assets/logo-lockup-transparent.png';
import { ACCEPTED_DOCUMENT_LABEL } from '../../lib/files';
import { providerLabel, selectAiReady, useUiStore } from '../../store/useUiStore';

function SystemStatus() {
  const health = useUiStore((state) => state.runtimeHealth);
  const aiReady = useUiStore(selectAiReady);
  const provider = useUiStore((state) => state.settings?.provider);
  const loading = useUiStore((state) => state.runtimeHealthLoading);
  const refresh = useUiStore((state) => state.refreshRuntimeHealth);

  if (!health) return (
    <p className="text-xs text-slate-500" role="status">
      {loading ? 'Comprobando recursos locales…' : <button type="button" onClick={() => void refresh()} className="font-semibold underline">Reintentar comprobación del sistema</button>}
    </p>
  );
  const available = health.capabilities.vault.ready && health.capabilities.legalSearch.ready && health.capabilities.legalCorpus.ready;
  if (!available) return (
    <Callout tone="warning" title="Algunas funciones locales requieren atención" action={<Link to="/configuracion?tab=datos" className="font-semibold underline">Ver detalles y volver a comprobar</Link>}>
      {!health.capabilities.vault.ready && <p>{health.capabilities.vault.detail}</p>}
      {!health.capabilities.legalSearch.ready && <p>{health.capabilities.legalSearch.detail}</p>}
      {!health.capabilities.legalCorpus.ready && <p>{health.capabilities.legalCorpus.detail}</p>}
    </Callout>
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} aria-hidden="true" /> Trabajo local disponible</span>
        <span>{aiReady ? `IA: ${providerLabel(provider)}` : 'IA opcional'}</span>
      </p>
      <Link to="/configuracion?tab=datos" className="font-semibold text-slate-600 hover:underline">Ver configuración</Link>
    </div>
  );
}

export default function HomePage() {
  return (
    <Page title="Inicio" description="Guía de uso de Lex Corporativo.">
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8" aria-label="Guía de Lex Corporativo">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-legal-gold/40 pb-5">
          <img src={logoUrl} alt="Lex Corporativo" className="h-28 w-44 max-w-full object-contain object-left" />
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Guía del usuario</p>
        </header>
        <h2 className="mt-6 font-serif text-2xl text-legal-950">Del documento a su revisión y mejora</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">Sube un documento al Estudio, revisa sus hallazgos y prepara los cambios que necesites. El Fundamentador te permite consultar artículos de forma independiente.</p>
        <ol className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            ['1. Audita tu archivo', 'Selecciona las materias y el alcance de la revisión. Consulta los hallazgos y fundamentos del informe.'],
            ['2. Prepara las correcciones', 'Desde un hallazgo puedes generar una cláusula o una adenda. Revisa y edita el resultado antes de exportarlo.'],
            ['3. Retoma tu trabajo', 'En el Portafolio puedes abrir los documentos generados e informes guardados para seguir trabajando.'],
          ].map(([title, text]) => <li key={title}><h3 className="text-sm font-semibold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p></li>)}
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/estudio/auditar" className="inline-flex items-center gap-2 rounded-lg bg-legal-950 px-4 py-3 text-sm font-semibold text-white">Auditar un documento <ArrowRight size={16} aria-hidden="true" /></Link>
          <Link to="/estudio/generar" className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Generar un documento</Link>
        </div>
      </section>
      <section aria-label="Funciones y requisitos" className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-5">
        <details className="py-4">
          <summary className="cursor-pointer text-sm font-semibold">Qué encontrarás en cada módulo</summary>
          <dl className="mt-4 space-y-3 text-sm text-slate-600">
            <div><dt className="font-semibold text-slate-950"><Link to="/estudio" className="underline">Estudio</Link></dt><dd>Audita archivos, genera documentos a partir de instrucciones o plantillas y consulta tu Portafolio.</dd></div>
            <div><dt className="font-semibold text-slate-950"><Link to="/fundamentador" className="underline">Fundamentador</Link></dt><dd>Busca artículos por tema y materia; copia citas o úsalas al generar un documento.</dd></div>
            <div><dt className="font-semibold text-slate-950"><Link to="/leyes" className="underline">Leyes</Link></dt><dd>Referencias y acceso a la página de la Cámara de Diputados en tu navegador.</dd></div>
          </dl>
        </details>
        <details className="py-4">
          <summary className="cursor-pointer text-sm font-semibold">Ficha técnica y primeros pasos</summary>
          <dl className="mt-4 space-y-3 text-sm text-slate-600">
            <div><dt className="font-semibold text-slate-950">Archivos admitidos</dt><dd>{ACCEPTED_DOCUMENT_LABEL}</dd></div>
            <div><dt className="font-semibold text-slate-950">Inteligencia artificial</dt><dd>Conecta tu clave de Gemini, OpenAI o Anthropic en <Link to="/configuracion?tab=ia" className="underline">Configuración</Link> para la auditoría con IA y la generación. Requiere conexión a Internet.</dd></div>
            <div><dt className="font-semibold text-slate-950">Funciones locales</dt><dd>Consulta de artículos, revisión básica, edición manual de plantillas y acceso al Portafolio. La revisión básica tiene un alcance distinto de la auditoría con IA.</dd></div>
            <div><dt className="font-semibold text-slate-950">Ayuda</dt><dd>Abre Ayuda en la barra lateral para consultar las instrucciones de la pantalla actual.</dd></div>
          </dl>
        </details>
      </section>
      <footer className="border-t border-slate-200 pt-4"><SystemStatus /></footer>
    </Page>
  );
}
