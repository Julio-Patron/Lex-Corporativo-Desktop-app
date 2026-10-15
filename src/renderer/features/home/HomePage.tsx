import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, CheckCircle2, FileSignature, ShieldCheck } from 'lucide-react';
import { Callout, ConfirmDialog, Page, SectionTitle, Spinner } from '../../components/ui';
import { BrandWatermark } from '../../components/BrandWatermark';
import { PortfolioRowSummary } from '../../components/PortfolioRow';
import { usePortfolioActions } from '../../hooks/usePortfolioActions';
import { listPortfolio } from '../../lib/portfolio';
import { providerLabel, selectAiReady, useUiStore } from '../../store/useUiStore';
import type { PortfolioItem } from '../../types';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

const TASKS = [
  {
    to: '/redactar',
    icon: FileSignature,
    title: 'Redactar',
    text: 'Prepara un contrato o escrito.',
  },
  {
    to: '/revisar',
    icon: ShieldCheck,
    title: 'Revisar',
    text: 'Examina un documento existente.',
  },
  {
    to: '/leyes',
    icon: BookOpenCheck,
    title: 'Consultar leyes',
    text: 'Busca un tema o lee una ley.',
  },
];

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
  const { openItem, openItemDialog } = usePortfolioActions();
  const draft = useWorkspaceStore((state) => state.draft);
  const review = useWorkspaceStore((state) => state.review);
  const [recent, setRecent] = useState<PortfolioItem[] | null>(null);
  const [recentError, setRecentError] = useState(false);

  useEffect(() => {
    let active = true;
    listPortfolio()
      .then(({ items }) => { if (active) setRecent(items.slice(0, 3)); })
      .catch(() => { if (active) setRecentError(true); });
    return () => { active = false; };
  }, []);

  return (
    <Page title="Inicio">
      <section className="relative isolate overflow-hidden py-5 lg:py-8" aria-label="Bienvenida">
        <BrandWatermark className="right-0 top-1/2 -z-10 h-72 w-72 -translate-y-1/2 lg:h-80 lg:w-80" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-legal-golddark">Tu estación jurídica</p>
        <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight text-legal-950 sm:text-4xl">Lex Corporativo</h2>
        <p className="mt-3 text-sm text-slate-600">¿Qué necesitas hacer hoy?</p>
      </section>

      {(draft.dirty || (draft.step === 'details' && (draft.template || draft.instructions.trim() || draft.referenceFile))) ? (
        <Link to="/redactar" className="flex items-center justify-between gap-3 rounded-lg border-l-2 border-legal-gold bg-white px-4 py-3">
          <span className="min-w-0"><span className="block text-xs text-slate-500">Documento en curso</span><span className="block truncate text-sm font-semibold">{draft.record?.title ?? draft.template?.title ?? 'Tu borrador'}</span></span>
          <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold">Continuar <ArrowRight size={16} aria-hidden="true" /></span>
        </Link>
      ) : review.file && !review.record ? (
        <Link to="/revisar" className="flex items-center justify-between gap-3 rounded-lg border-l-2 border-legal-gold bg-white px-4 py-3">
          <span className="min-w-0"><span className="block text-xs text-slate-500">Revisión pendiente</span><span className="block truncate text-sm font-semibold">{review.file.name}</span></span>
          <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold">Continuar <ArrowRight size={16} aria-hidden="true" /></span>
        </Link>
      ) : null}

      <nav className="grid gap-3 md:grid-cols-3" aria-label="Empezar una tarea">
        {TASKS.map(({ to, icon: Icon, title, text }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 transition hover:border-legal-gold/60 hover:shadow-card"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center text-legal-golddark">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-950">{title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">{text}</span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-legal-golddark" aria-hidden="true" />
          </Link>
        ))}
      </nav>

      <section className="py-3" aria-label="Trabajo reciente">
          <SectionTitle
            title="Recientes"
            actions={<Link to="/portafolio" className="text-xs font-semibold text-slate-600 hover:underline">Ver portafolio</Link>}
          />
          {recentError ? (
            <Callout tone="warning" title="No se pudo cargar el trabajo reciente" action={<Link to="/portafolio" className="font-semibold underline">Abrir portafolio para reintentar</Link>}>
              No se pudo comprobar qué documentos están guardados.
            </Callout>
          ) : recent === null ? (
            <Spinner />
          ) : recent.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Los documentos y revisiones que guardes aparecerán aquí.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((item) => (
                <li key={`${item.caseId}:${item.record.id}`}>
                  <button type="button" onClick={() => openItem(item)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50">
                    <PortfolioRowSummary item={item} />
                    <ArrowRight size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
      </section>
      <footer className="border-t border-slate-200/80 pt-4"><SystemStatus /></footer>
      <ConfirmDialog {...openItemDialog} />
    </Page>
  );
}
