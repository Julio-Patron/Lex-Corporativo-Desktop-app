import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ExternalLink, Search } from 'lucide-react';
import { AreaTag, Badge, Callout, Card, EmptyState, Page, RadioGroup, TextInput } from '../../components/ui';
import { normalizeSearchText } from '../../lib/drafting';
import { LEGAL_AREA_INFO, LEGAL_AREAS, type LegalArea } from '../../lib/legal-areas';
import { LawReaderDialog } from './LawReaderDialog';
import { useSendArticleToDraft } from './useSendArticleToDraft';
import { cn } from '../../lib/utils';

type CorpusOverview = Awaited<ReturnType<typeof window.lexDesktop.legalCorpus.list>>;

const DIPUTADOS_URL = 'https://www.diputados.gob.mx/LeyesBiblio/index.htm';

function failureMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string' && error.message) return error.message;
  return 'No se pudo leer el inventario del corpus.';
}

export default function LawsPage() {
  const [overview, setOverview] = useState<CorpusOverview | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState<LegalArea | 'todas'>('todas');
  const [readerCode, setReaderCode] = useState<string | null>(null);
  const sendArticleToDraft = useSendArticleToDraft();

  useEffect(() => {
    let alive = true;
    window.lexDesktop.legalCorpus.list()
      .then((value) => { if (alive) setOverview(value); })
      .catch((cause: unknown) => { if (alive) setError(failureMessage(cause)); });
    return () => { alive = false; };
  }, []);

  const filteredLaws = useMemo(() => {
    const list = overview?.laws ?? [];
    const term = normalizeSearchText(query);
    return list.filter((law) => {
      if (areaFilter !== 'todas' && law.module !== areaFilter) return false;
      if (!term) return true;
      return normalizeSearchText(`${law.name} ${law.code}`).includes(term);
    });
  }, [overview, query, areaFilter]);

  const versionShort = overview?.corpusVersion.match(/^\d{4}\.\d{2}/)?.[0] ?? overview?.corpusVersion;

  return (
    <Page
      title="Leyes"
      description="Biblioteca legislativa federal mexicana e inventario del corpus instalado."
      width="wide"
      actions={overview && (
        <>
          <Badge tone="neutral" className="gap-1.5 px-3 py-1">
            <BookOpen size={13} className="text-slate-500" aria-hidden="true" />
            {overview.lawsCount} ordenamientos
          </Badge>
          <Badge tone="success" className="gap-1.5 px-3 py-1">
            <CheckCircle2 size={13} aria-hidden="true" />
            {overview.provisionsCount.toLocaleString('es-MX')} disposiciones
          </Badge>
        </>
      )}
    >
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" aria-hidden="true" />
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar ley por nombre o acrónimo (ej. LGSM, LFT, CFF)..."
              aria-label="Buscar ordenamiento"
              className="pl-10"
            />
          </div>
          <RadioGroup
            label="Filtrar por materia"
            value={areaFilter}
            onChange={setAreaFilter}
            className="flex flex-wrap gap-1.5"
            optionClassName={(selected) => cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all',
              selected
                ? 'border-legal-950 bg-legal-950 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
            )}
            options={(['todas', ...LEGAL_AREAS] as const).map((value) => ({
              value,
              label: value === 'todas' ? 'Todas' : LEGAL_AREA_INFO[value].shortLabel,
            }))}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <p>
            Ordenamientos de la legislación federal mexicana integrados localmente para consulta RAG
            {versionShort ? ` · Versión ${versionShort}` : ''}.
          </p>
          <a
            href={DIPUTADOS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-legal-950 underline decoration-legal-gold underline-offset-4 hover:text-legal-golddark"
          >
            Cámara de Diputados
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
      </Card>

      {error && <Callout tone="warning" title="El inventario no está disponible">{error}</Callout>}
      {!overview && !error && <p className="text-sm text-slate-600" role="status">Cargando el inventario del corpus…</p>}

      {overview && filteredLaws.length === 0 && (
        <EmptyState
          icon={Search}
          title="No se encontraron ordenamientos"
          description="Prueba con otro nombre, sigla o filtro de materia."
        />
      )}

      {overview && filteredLaws.length > 0 && (
        <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredLaws.map((law) => {
            const area = (LEGAL_AREAS.includes(law.module as LegalArea) ? law.module : 'corporativo') as LegalArea;
            return (
              <li
                key={law.code}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all hover:border-slate-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <AreaTag area={area} />
                    <span className="rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                      {law.code}
                    </span>
                  </div>
                  <h3 className="mt-3.5 text-base font-bold leading-snug text-legal-950">{law.name}</h3>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {LEGAL_AREA_INFO[area].label} · Corpus local verificado
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
                  <span className="text-xs font-semibold text-slate-600">
                    {law.provisions.toLocaleString('es-MX')} disposiciones
                  </span>
                  <button
                    type="button"
                    onClick={() => setReaderCode(law.code)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-legal-950 transition-colors hover:border-slate-300 hover:bg-slate-100"
                  >
                    Abrir articulado
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <LawReaderDialog
        lawCode={readerCode}
        onClose={() => setReaderCode(null)}
        onUseArticle={(citation, area) => {
          setReaderCode(null);
          sendArticleToDraft(citation, area);
        }}
      />
    </Page>
  );
}

