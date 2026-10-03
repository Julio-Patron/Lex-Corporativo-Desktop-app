import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, CheckCircle2, FileSignature, FolderOpen, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Button, Card, EmptyState, Page, SectionTitle, Spinner } from '../../components/ui';
import { PortfolioRowSummary } from '../../components/PortfolioRow';
import { usePortfolioActions } from '../../hooks/usePortfolioActions';
import { listPortfolio } from '../../lib/portfolio';
import { providerLabel, selectAiReady, useUiStore } from '../../store/useUiStore';
import type { PortfolioItem } from '../../types';

const TASKS = [
  {
    to: '/redactar',
    icon: FileSignature,
    title: 'Redactar un documento',
    text: 'Elige entre 48 documentos base o parte de tu propio archivo. Llena los datos y obtén el borrador.',
  },
  {
    to: '/revisar',
    icon: ShieldCheck,
    title: 'Revisar un documento',
    text: 'Sube un contrato o escrito para detectar riesgos, omisiones y cláusulas faltantes.',
  },
  {
    to: '/leyes',
    icon: BookOpenCheck,
    title: 'Consultar leyes',
    text: 'Busca artículos por tema en 16 leyes federales y léelas completas.',
  },
];

function SystemStatus() {
  const health = useUiStore((state) => state.runtimeHealth);
  const aiReady = useUiStore(selectAiReady);
  const provider = useUiStore((state) => state.settings?.provider);
  const requestProcessingSetup = useUiStore((state) => state.requestProcessingSetup);
  const navigate = useNavigate();

  if (!health) return <Spinner label="Comprobando el sistema…" />;
  const rows = [
    { id: 'vault', label: 'Portafolio cifrado', ok: health.capabilities.vault.ready, detail: health.capabilities.vault.detail },
    { id: 'laws', label: 'Leyes e índice de búsqueda', ok: health.capabilities.legalSearch.ready && health.capabilities.legalCorpus.ready, detail: health.capabilities.legalSearch.detail },
  ];
  return (
    <ul className="space-y-3 text-sm">
      {rows.map((row) => (
        <li key={row.id} className="flex items-start gap-2.5">
          {row.ok
            ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
            : <TriangleAlert size={17} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />}
          <div>
            <p className="font-semibold text-slate-900">{row.label}</p>
            {!row.ok && <p className="text-slate-600">{row.detail}</p>}
          </div>
        </li>
      ))}
      <li className="flex items-start gap-2.5">
        {aiReady
          ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
          : <TriangleAlert size={17} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />}
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{aiReady ? `IA conectada: ${providerLabel(provider)}` : 'IA sin conectar'}</p>
          {!aiReady && (
            <>
              <p className="text-slate-600">Puedes usar documentos base, la revisión básica y la consulta de leyes.</p>
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => requestProcessingSetup('redactar y revisar con IA')}>Conectar IA</Button>
            </>
          )}
        </div>
      </li>
      {!health.capabilities.vault.ready && (
        <li><Button size="sm" variant="ghost" onClick={() => navigate('/configuracion?tab=datos')}>Ver detalles</Button></li>
      )}
    </ul>
  );
}

export default function HomePage() {
  const { openItem } = usePortfolioActions();
  const [recent, setRecent] = useState<PortfolioItem[] | null>(null);

  useEffect(() => {
    let active = true;
    listPortfolio()
      .then(({ items }) => { if (active) setRecent(items.slice(0, 5)); })
      .catch(() => { if (active) setRecent([]); });
    return () => { active = false; };
  }, []);

  return (
    <Page title="Inicio" description="¿Qué necesitas hacer hoy?">
      <div className="grid gap-4 md:grid-cols-3">
        {TASKS.map(({ to, icon: Icon, title, text }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-slate-300 hover:shadow-card-hover"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-legal-950">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="mt-4 text-base font-semibold text-slate-950">{title}</span>
            <span className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">{text}</span>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-legal-950">
              Empezar <ArrowRight size={16} className="transition group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <SectionTitle
            title="Continuar"
            description="Lo último que guardaste en el portafolio."
            actions={<Link to="/portafolio" className="text-sm font-semibold text-legal-950 hover:underline">Ver todo</Link>}
          />
          {recent === null ? (
            <Spinner />
          ) : recent.length === 0 ? (
            <EmptyState icon={FolderOpen} title="Aún no hay trabajo guardado" description="Los documentos y revisiones que guardes aparecerán aquí." />
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
        </Card>
        <Card>
          <SectionTitle title="Estado del sistema" />
          <SystemStatus />
        </Card>
      </div>
    </Page>
  );
}
