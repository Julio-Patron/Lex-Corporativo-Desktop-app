import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Callout, Page } from '../../components/ui';
import { LEGAL_AREA_INFO, LEGAL_AREAS, type LegalArea } from '../../lib/legal-areas';

type CorpusOverview = Awaited<ReturnType<typeof window.lexDesktop.legalCorpus.list>>;

const DIPUTADOS_URL = 'https://www.diputados.gob.mx/LeyesBiblio/index.htm';

function failureMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string' && error.message) return error.message;
  return 'No se pudo leer el inventario del corpus.';
}

export default function LawsPage() {
  const [overview, setOverview] = useState<CorpusOverview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    window.lexDesktop.legalCorpus.list()
      .then((value) => { if (alive) setOverview(value); })
      .catch((cause: unknown) => { if (alive) setError(failureMessage(cause)); });
    return () => { alive = false; };
  }, []);

  const sections = LEGAL_AREAS.map((area) => ({
    area,
    laws: overview?.laws.filter((law) => law.module === area) ?? [],
  })).filter((section) => section.laws.length > 0);

  return (
    <Page title="Leyes" description="Inventario del corpus legal integrado.">
      <header className="border-b border-legal-gold/80 pb-5">
        <h2 className="font-serif text-[1.75rem] font-medium leading-tight text-legal-950">Corpus legal integrado</h2>
        <p className="mt-3 max-w-prose text-[15px] leading-6 text-slate-600">
          Ordenamientos de la legislación federal mexicana. El buscador normativo responde con RAG sobre este corpus. La fuente de verificación es la Cámara de Diputados del H. Congreso de la Unión.
        </p>
        {overview && (
          <p className="mt-4 text-sm leading-6 text-slate-700">
            {overview.lawsCount} ordenamientos y {overview.provisionsCount.toLocaleString('es-MX')} disposiciones. Versión {overview.corpusVersion.match(/^\d{4}\.\d{2}/)?.[0] ?? overview.corpusVersion}.
          </p>
        )}
        <a
          href={DIPUTADOS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-legal-950 underline decoration-legal-gold underline-offset-4"
        >
          Cámara de Diputados
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </header>

      {error && <Callout tone="warning" title="El inventario no está disponible">{error}</Callout>}
      {!overview && !error && <p className="text-sm text-slate-600" role="status">Cargando el inventario del corpus…</p>}

      {sections.map(({ area, laws }) => (
        <CorpusSection key={area} area={area} laws={laws} />
      ))}
    </Page>
  );
}

function CorpusSection({ area, laws }: { area: LegalArea; laws: CorpusOverview['laws'] }) {
  const info = LEGAL_AREA_INFO[area];
  return (
    <section aria-labelledby={`corpus-${area}`}>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`corpus-${area}`} className="font-serif text-xl font-medium text-legal-950">{info.label}</h3>
        <p className="text-sm text-slate-500">{laws.length === 1 ? '1 ordenamiento' : `${laws.length} ordenamientos`}</p>
      </div>
      <ol className="border-t border-slate-200">
        {laws.map((law) => (
          <li key={law.code} className="border-b border-slate-200 py-4">
            <div className="flex items-baseline justify-between gap-4">
              <p className="min-w-0 font-serif text-lg leading-snug text-legal-950">{law.name}</p>
              <p className="shrink-0 text-sm font-medium text-slate-500">{law.code}</p>
            </div>
            <p className="mt-1 text-sm text-slate-500">{law.provisions.toLocaleString('es-MX')} disposiciones</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
