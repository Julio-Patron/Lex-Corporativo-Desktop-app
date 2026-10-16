import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Clipboard, FileSignature, Search } from 'lucide-react';
import { AreaTag, Button, Callout, Card, EmptyState, Page, RadioGroup, SectionTitle, Spinner, TextInput } from '../../components/ui';
import { LEGAL_AREA_INFO, LEGAL_AREAS, isLegalArea, type LegalArea } from '../../lib/legal-areas';
import { suggestAlternativeLegalModule } from '../../lib/legal-search-routing';
import { cn } from '../../lib/utils';
import { useUiStore } from '../../store/useUiStore';
import { useSendArticleToDraft } from './useSendArticleToDraft';

type AreaFilter = LegalArea | 'todos';
type Citation = Awaited<ReturnType<typeof window.lexDesktop.legalKnowledge.searchRAG>>['citations'][number];

const EXAMPLES = ['rescisión sin responsabilidad', 'requisitos del pagaré', 'acreditamiento del IVA', 'rectificación de pedimento'];

function AreaFilterChips({ value, onChange }: { value: AreaFilter; onChange: (value: AreaFilter) => void }) {
  return (
    <RadioGroup
      label="Materia"
      value={value}
      onChange={onChange}
      className="flex flex-wrap gap-1.5"
      optionClassName={(selected) => cn(
        'h-9 rounded-lg border px-3 text-sm font-semibold transition-colors',
        selected ? 'border-legal-950 bg-legal-950 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
      )}
      options={(['todos', ...LEGAL_AREAS] as const).map((area) => ({ value: area, label: area === 'todos' ? 'Todas' : LEGAL_AREA_INFO[area].shortLabel }))}
    />
  );
}

function citationText(result: Citation): string {
  return `${result.law_code ?? result.title} · ${result.article_number ?? result.subtitle ?? ''}\n"${result.content}"`;
}

export default function FundamentadorPage() {
  const notify = useUiStore((state) => state.notify);
  const sendArticleToDraft = useSendArticleToDraft();
  const [area, setArea] = useState<AreaFilter>('todos');
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Citation[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState('');
  const searchRequest = useRef(0);
  useEffect(() => () => { searchRequest.current++; }, []);

  const suggestedArea = useMemo(
    () => (searchedQuery && area !== 'todos' ? suggestAlternativeLegalModule(searchedQuery, area) : null),
    [searchedQuery, area],
  );

  const search = async (value = query, searchArea: AreaFilter = area) => {
    const text = value.trim();
    if (!text) return;
    const request = ++searchRequest.current;
    setQuery(text);
    setSearchedQuery(text);
    setArea(searchArea);
    setSearching(true);
    setSearchError('');
    setExpanded(new Set());
    try {
      const response = await window.lexDesktop.legalKnowledge.searchRAG({ query: text, module: searchArea, limit: 8, useReranker: true });
      if (request !== searchRequest.current) return;
      setResults(response.citations);
    } catch (error: any) {
      if (request !== searchRequest.current) return;
      setSearchError(error?.message || 'No se pudo buscar en las leyes locales.');
      setResults(null);
    } finally {
      if (request === searchRequest.current) setSearching(false);
    }
  };

  const copy = async (result: Citation) => {
    try {
      await navigator.clipboard.writeText(citationText(result));
      setCopiedId(String(result.id));
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      notify('No se pudo copiar al portapapeles.', 'warning');
    }
  };

  return (
    <Page
      title="Fundamentador"
      description="Consulta artículos por tema, copia una cita o úsala al generar un documento."
      width="wide"
    >
      <Card>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => { event.preventDefault(); void search(); }}
          role="search"
        >
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" aria-hidden="true" />
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar artículos por tema"
              aria-label="Buscar artículos"
              className="pl-9"
            />
          </div>
          <Button type="submit" isLoading={searching} disabled={!query.trim()}>Buscar</Button>
        </form>
        <div className="mt-3 space-y-3">
          <AreaFilterChips value={area} onChange={(value) => { setArea(value); if (searchedQuery) void search(searchedQuery, value); }} />
          {!searchedQuery && <details className="text-xs text-slate-500">
            <summary className="cursor-pointer font-semibold">Ejemplos de búsqueda</summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLES.map((example) => (
              <button key={example} type="button" onClick={() => void search(example)} className="rounded-md px-2 py-1 text-xs font-semibold text-legal-950 hover:bg-slate-100">
                {example}
              </button>
            ))}
            </div>
          </details>}
        </div>
      </Card>

      {searching && <Spinner label="Buscando en las leyes locales…" />}

      {!searching && searchError && (
        <Callout tone="warning" title="No se pudo completar la búsqueda" action={<Button size="sm" variant="secondary" onClick={() => void search(searchedQuery)}>Reintentar búsqueda</Button>}>
          {searchError}
        </Callout>
      )}

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

    </Page>
  );
}
