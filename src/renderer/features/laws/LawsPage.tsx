import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Check, ChevronDown, Clipboard, Download, FileSignature, Search } from 'lucide-react';
import { AreaTag, Button, Callout, Card, EmptyState, Page, SectionTitle, Spinner, TextInput } from '../../components/ui';
import { LEGAL_AREA_INFO, LEGAL_AREAS, isLegalArea, type LegalArea } from '../../lib/legal-areas';
import { suggestAlternativeLegalModule } from '../../lib/legal-search-routing';
import { cn } from '../../lib/utils';
import { useUiStore } from '../../store/useUiStore';
import { LawReaderDialog } from './LawReaderDialog';
import { useSendArticleToDraft } from './useSendArticleToDraft';

type AreaFilter = LegalArea | 'todos';
type Citation = Awaited<ReturnType<typeof window.lexDesktop.legalKnowledge.searchRAG>>['citations'][number];
type CorpusOverview = Awaited<ReturnType<typeof window.lexDesktop.legalCorpus.list>>;

const EXAMPLES = ['rescisión sin responsabilidad', 'requisitos del pagaré', 'acreditamiento del IVA', 'rectificación de pedimento'];

function AreaFilterChips({ value, onChange }: { value: AreaFilter; onChange: (value: AreaFilter) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Materia">
      {(['todos', ...LEGAL_AREAS] as const).map((area) => (
        <button
          key={area}
          type="button"
          role="radio"
          aria-checked={value === area}
          onClick={() => onChange(area)}
          className={cn(
            'h-9 rounded-lg border px-3 text-sm font-semibold transition-colors',
            value === area ? 'border-legal-950 bg-legal-950 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
          )}
        >
          {area === 'todos' ? 'Todas' : LEGAL_AREA_INFO[area].shortLabel}
        </button>
      ))}
    </div>
  );
}

function citationText(result: Citation): string {
  return `${result.law_code ?? result.title} · ${result.article_number ?? result.subtitle ?? ''}\n"${result.content}"`;
}

export default function LawsPage() {
  const notify = useUiStore((state) => state.notify);
  const sendArticleToDraft = useSendArticleToDraft();
  const [area, setArea] = useState<AreaFilter>('todos');
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Citation[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [overview, setOverview] = useState<CorpusOverview | null>(null);
  const [reader, setReader] = useState<{ code: string; article?: string } | null>(null);
  const libraryRef = useRef<HTMLElement>(null);
  const [searchParams] = useSearchParams();
  const showLibrary = searchParams.get('vista') === 'biblioteca';

  useEffect(() => {
    window.lexDesktop.legalCorpus.list()
      .then(setOverview)
      .catch((error: any) => notify(error?.message || 'No se pudo abrir la biblioteca de leyes.', 'error'));
  }, [notify]);

  useEffect(() => {
    if (showLibrary && overview) libraryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [showLibrary, overview]);

  const suggestedArea = useMemo(
    () => (searchedQuery && area !== 'todos' ? suggestAlternativeLegalModule(searchedQuery, area) : null),
    [searchedQuery, area],
  );

  const laws = useMemo(
    () => (overview?.laws ?? []).filter((law) => area === 'todos' || law.module === area),
    [overview, area],
  );

  const search = async (value = query, searchArea: AreaFilter = area) => {
    const text = value.trim();
    if (!text) return;
    setQuery(text);
    setArea(searchArea);
    setSearching(true);
    setExpanded(new Set());
    try {
      const response = await window.lexDesktop.legalKnowledge.searchRAG({ query: text, module: searchArea, limit: 8, useReranker: true });
      setResults(response.citations);
      setSearchedQuery(text);
    } catch (error: any) {
      notify(error?.message || 'No se pudo buscar en las leyes locales.', 'error');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const copy = async (result: Citation) => {
    await navigator.clipboard.writeText(citationText(result));
    setCopiedId(String(result.id));
    setTimeout(() => setCopiedId(null), 1500);
  };

  const download = async (code: string, name: string) => {
    try {
      const response = await window.lexDesktop.legalCorpus.download({ code });
      if (response.success) notify(`${name} guardada en Markdown.`, 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo descargar la ley.', 'error');
    }
  };

  return (
    <Page
      title="Leyes"
      description={overview
        ? `${overview.lawsCount} leyes federales y ${overview.provisionsCount.toLocaleString('es-MX')} disposiciones instaladas en este equipo.`
        : 'Leyes federales instaladas en este equipo.'}
      width="wide"
    >
      <Card>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => { event.preventDefault(); void search(); }}
          role="search"
        >
          <div className="relative min-w-[260px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" aria-hidden="true" />
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Escribe el tema: rescisión sin responsabilidad, requisitos del CFDI…"
              aria-label="Buscar artículos"
              className="pl-9"
            />
          </div>
          <Button type="submit" isLoading={searching} disabled={!query.trim()}>Buscar</Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <AreaFilterChips value={area} onChange={(value) => { setArea(value); if (searchedQuery) void search(searchedQuery, value); }} />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500">Ejemplos:</span>
            {EXAMPLES.map((example) => (
              <button key={example} type="button" onClick={() => void search(example)} className="rounded-md px-2 py-1 text-xs font-semibold text-legal-950 hover:bg-slate-100">
                {example}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {searching && <Spinner label="Buscando en las leyes locales…" />}

      {!searching && results !== null && (
        <section aria-label="Resultados">
          <SectionTitle
            title={results.length ? `${results.length} artículos para «${searchedQuery}»` : `Sin resultados para «${searchedQuery}»`}
            description={area === 'todos' ? 'En todas las materias.' : `En ${LEGAL_AREA_INFO[area].label}: ${LEGAL_AREA_INFO[area].laws}.`}
          />
          {suggestedArea && (
            <Callout
              tone="info"
              className="mb-4"
              title={`La consulta parece de materia ${LEGAL_AREA_INFO[suggestedArea].label.toLowerCase()}`}
              action={<Button size="sm" variant="secondary" onClick={() => void search(searchedQuery, suggestedArea)}>Buscar en {LEGAL_AREA_INFO[suggestedArea].shortLabel}</Button>}
            />
          )}
          {results.length === 0 ? (
            <EmptyState icon={Search} title="No se encontraron artículos relacionados" description="Prueba con otras palabras o busca en todas las materias." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {results.map((result) => {
                const id = String(result.id);
                const isExpanded = expanded.has(id);
                const module = isLegalArea(result.module) ? result.module : null;
                return (
                  <li key={id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card">
                    <div className="flex flex-wrap items-center gap-2">
                      {module && <AreaTag area={module} />}
                      <span className="text-sm font-semibold text-slate-950">{result.law_code ?? result.title}</span>
                      <span className="text-sm text-slate-600">{result.article_number ?? result.subtitle}</span>
                    </div>
                    <p className={cn('mt-3 flex-1 whitespace-pre-line font-serif text-sm leading-relaxed text-slate-800', !isExpanded && 'line-clamp-5')}>{result.content}</p>
                    <button
                      type="button"
                      onClick={() => setExpanded((current) => {
                        const next = new Set(current);
                        if (next.has(id)) next.delete(id); else next.add(id);
                        return next;
                      })}
                      className="mt-2 inline-flex items-center gap-1 self-start text-xs font-semibold text-slate-600 hover:text-slate-950"
                      aria-expanded={isExpanded}
                    >
                      <ChevronDown size={14} className={cn('transition-transform', isExpanded && 'rotate-180')} aria-hidden="true" />
                      {isExpanded ? 'Ver menos' : 'Ver completo'}
                    </button>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                      {result.law_code && (
                        <Button size="sm" variant="secondary" onClick={() => setReader({ code: result.law_code!, article: result.article_number })}>
                          <BookOpen size={14} aria-hidden="true" /> Leer en la ley
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => void copy(result)}>
                        {copiedId === id ? <Check size={14} aria-hidden="true" /> : <Clipboard size={14} aria-hidden="true" />} Copiar cita
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => sendArticleToDraft(citationText(result), module ?? undefined)}>
                        <FileSignature size={14} aria-hidden="true" /> Usar en documento
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section ref={libraryRef} aria-label="Biblioteca de leyes">
        <SectionTitle
          title="Biblioteca"
          description={area === 'todos' ? 'Todas las leyes instaladas.' : `Leyes de ${LEGAL_AREA_INFO[area].label.toLowerCase()}.`}
        />
        {!overview ? (
          <Spinner label="Abriendo la biblioteca…" />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {laws.map((law) => (
              <li key={law.code} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <AreaTag area={law.module} />
                  <span className="text-xs font-semibold text-slate-500">{law.code}</span>
                </div>
                <p className="mt-3 flex-1 text-sm font-semibold text-slate-950">{law.name}</p>
                <p className="mt-1 text-xs text-slate-500">{law.provisions.toLocaleString('es-MX')} disposiciones</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => setReader({ code: law.code })}>
                    <BookOpen size={14} aria-hidden="true" /> Leer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void download(law.code, law.name)}>
                    <Download size={14} aria-hidden="true" /> Descargar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LawReaderDialog
        lawCode={reader?.code ?? null}
        articleRef={reader?.article}
        onClose={() => setReader(null)}
        onUseArticle={(citation, lawArea) => { setReader(null); sendArticleToDraft(citation, lawArea); }}
      />
    </Page>
  );
}
