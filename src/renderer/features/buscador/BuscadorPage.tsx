import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { BookOpen, Check, ChevronDown, Clipboard, Compass, FileSignature, Link2, Sparkles } from 'lucide-react';
import { BrandPlate } from '../../components/BrandWatermark';
import { AreaTag, Button, Callout, RadioGroup, TextArea } from '../../components/ui';
import { LEGAL_AREA_INFO, LEGAL_AREAS, isLegalArea, type LegalArea } from '../../lib/legal-areas';
import { suggestAlternativeLegalModule } from '../../lib/legal-search-routing';
import { cn } from '../../lib/utils';
import { useUiStore } from '../../store/useUiStore';
import { LawReaderDialog } from '../laws/LawReaderDialog';
import { useSendArticleToDraft } from '../laws/useSendArticleToDraft';

type AreaFilter = LegalArea | 'todos';
type SearchRAGResponse = Awaited<ReturnType<typeof window.lexDesktop.legalKnowledge.searchRAG>>;
type Citation = SearchRAGResponse['citations'][number];
type RelatedQueryItem = NonNullable<SearchRAGResponse['relatedQueries']>[number];

interface Turn {
  id: number;
  query: string;
  area: AreaFilter;
  status: 'loading' | 'ready' | 'error';
  results: Citation[] | null;
  connectionSummary?: string;
  connectionMode?: 'ai' | 'local';
  relatedQueries?: RelatedQueryItem[];
  error: string;
  expanded: string[];
}

interface BuscadorSessionState {
  area: AreaFilter;
  draft: string;
  turns: Turn[];
  seq: number;
  inflight: boolean;
  setArea: (area: AreaFilter) => void;
  setDraft: (draft: string) => void;
  setTurns: (updater: (current: Turn[]) => Turn[]) => void;
  nextTurnId: () => number;
  setInflight: (inflight: boolean) => void;
}

const useBuscadorStore = create<BuscadorSessionState>((set, get) => ({
  area: 'todos',
  draft: '',
  turns: [],
  seq: 0,
  inflight: false,
  setArea: (area) => set({ area }),
  setDraft: (draft) => set({ draft }),
  setTurns: (updater) => set((state) => ({ turns: updater(state.turns) })),
  nextTurnId: () => {
    const next = get().seq + 1;
    set({ seq: next });
    return next;
  },
  setInflight: (inflight) => set({ inflight }),
}));

function areaPhrase(area: AreaFilter): string {
  return area === 'todos' ? 'en todas las materias' : `en ${LEGAL_AREA_INFO[area].label}`;
}

function citationText(result: Citation): string {
  return `${result.law_code ?? result.title} · ${result.article_number ?? result.subtitle ?? ''}\n"${result.content}"`;
}

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string' && error.message) return error.message;
  return 'No se pudo buscar en las leyes locales.';
}

function Opening({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <div className="mb-5 flex items-center gap-3">
        <BrandPlate size="small" />
        <h1 className="font-serif text-lg font-medium leading-tight text-legal-950">Buscador normativo</h1>
      </div>
    );
  }

  return (
    <div className="mb-5 flex flex-col items-center text-center">
      <BrandPlate className="animate-fade-in-up" />
      <p className="mt-4 font-serif text-[1.75rem] font-medium leading-tight text-legal-950">Lex Corporativo</p>
      <h1 className="mt-1 font-serif text-base leading-snug text-slate-600">Buscador normativo</h1>
    </div>
  );
}

export default function BuscadorPage() {
  const notify = useUiStore((state) => state.notify);
  const sendArticleToDraft = useSendArticleToDraft();
  const area = useBuscadorStore((state) => state.area);
  const setArea = useBuscadorStore((state) => state.setArea);
  const draft = useBuscadorStore((state) => state.draft);
  const setDraft = useBuscadorStore((state) => state.setDraft);
  const turns = useBuscadorStore((state) => state.turns);
  const setTurns = useBuscadorStore((state) => state.setTurns);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [readerTarget, setReaderTarget] = useState<{ lawCode: string; articleRef?: string | null } | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const busy = turns.some((turn) => turn.status === 'loading');

  const tail = turns.map((turn) => `${turn.id}:${turn.status}`).join('|');
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || turns.length === 0) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [tail, turns.length]);

  const consult = async (value: string, searchArea: AreaFilter = area, existingId?: number) => {
    const text = value.trim();
    const store = useBuscadorStore.getState();
    if (!text || store.inflight) return;
    store.setInflight(true);
    const id = existingId ?? store.nextTurnId();
    const next: Turn = { id, query: text, area: searchArea, status: 'loading', results: null, error: '', expanded: [] };
    setTurns((current) => existingId ? current.map((turn) => turn.id === id ? next : turn) : [...current, next]);
    if (!existingId) setDraft('');
    try {
      const response = await window.lexDesktop.legalKnowledge.searchRAG({ query: text, module: searchArea, limit: 8, useReranker: true });
      setTurns((current) => current.map((turn) => (
        turn.id === id
          ? {
              ...turn,
              status: 'ready',
              results: response.citations,
              connectionSummary: response.connectionSummary,
              connectionMode: response.connectionMode,
              relatedQueries: response.relatedQueries,
            }
          : turn
      )));
    } catch (error: unknown) {
      setTurns((current) => current.map((turn) => turn.id === id ? { ...turn, status: 'error', error: errorMessage(error), results: null } : turn));
    } finally {
      useBuscadorStore.getState().setInflight(false);
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

  const toggleExpanded = (turnId: number, citationId: string) => {
    setTurns((current) => current.map((turn) => {
      if (turn.id !== turnId) return turn;
      const expanded = turn.expanded.includes(citationId)
        ? turn.expanded.filter((item) => item !== citationId)
        : [...turn.expanded, citationId];
      return { ...turn, expanded };
    }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end px-4 py-6 sm:px-6">
          <Opening compact={turns.length > 0} />

          <div className={cn(turns.length > 0 && 'space-y-6')} aria-live="polite">
            {turns.map((turn) => {
              const suggested = turn.status === 'ready' && turn.area !== 'todos' ? suggestAlternativeLegalModule(turn.query, turn.area) : null;
              return (
                <article key={turn.id} className="space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-[85%]">
                      <p className="rounded-2xl rounded-br-md bg-legal-950 px-3.5 py-2.5 text-[15px] leading-6 text-white">{turn.query}</p>
                      <p className="mt-1 text-right text-xs text-slate-500">{areaPhrase(turn.area)}</p>
                    </div>
                  </div>

                  {turn.status === 'loading' && <p className="text-sm text-slate-600" role="status">Buscando en las leyes de este equipo…</p>}

                  {turn.status === 'error' && (
                    <Callout tone="warning" title="No se pudo completar la búsqueda" action={<Button size="sm" variant="secondary" onClick={() => void consult(turn.query, turn.area, turn.id)}>Reintentar</Button>}>
                      {turn.error}
                    </Callout>
                  )}

                  {turn.status === 'ready' && turn.results && (
                    <div className="max-w-[95%] border-l-2 border-legal-gold pl-4">
                      <p className="text-sm leading-6 text-slate-600">
                        {turn.results.length
                          ? `${turn.results.length} artículos ${areaPhrase(turn.area)} para «${turn.query}».`
                          : `Sin artículos ${areaPhrase(turn.area)} para «${turn.query}».`}
                      </p>

                      {turn.results.length > 0 && turn.connectionSummary && (
                        <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 text-slate-800">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-legal-950">
                              <Link2 size={13} className="text-legal-gold" aria-hidden="true" />
                              Conexión entre la consulta y los fundamentos
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              {turn.connectionMode === 'ai' && <Sparkles size={11} className="text-legal-gold" aria-hidden="true" />}
                              {turn.connectionMode === 'ai' ? 'Correlación con IA sobre corpus' : 'Correlación en corpus local'}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-700">
                            {turn.connectionSummary}
                          </p>
                        </div>
                      )}

                      {suggested && (
                        <Callout
                          tone="info"
                          className="mt-3"
                          title={`La consulta parece de materia ${LEGAL_AREA_INFO[suggested].label.toLowerCase()}`}
                          action={<Button size="sm" variant="secondary" onClick={() => void consult(turn.query, suggested)}>Buscar en {LEGAL_AREA_INFO[suggested].shortLabel}</Button>}
                        />
                      )}
                      {turn.results.length === 0 && turn.area !== 'todos' && (
                        <Button size="sm" variant="secondary" className="mt-3" onClick={() => void consult(turn.query, 'todos')}>Buscar en todas las materias</Button>
                      )}
                      {turn.results.length > 0 && (
                        <ul className="mt-3 space-y-3">
                          {turn.results.map((result) => {
                            const id = String(result.id);
                            const isExpanded = turn.expanded.includes(id);
                            const module = isLegalArea(result.module) ? result.module : null;
                            const relatedRefs = result.related_refs || [];
                            const matchedTerms = (result.matched_terms || []).slice(0, 5);
                            return (
                              <li key={id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                  {module && <AreaTag area={module} />}
                                  <span className="text-[15px] font-semibold text-legal-950">{result.law_code ?? result.title}</span>
                                  <span className="text-sm text-slate-500">{result.article_number ?? result.subtitle}</span>
                                </div>

                                {result.connection && (
                                  <div className="mt-2 rounded-lg border border-slate-200/80 bg-slate-50/90 px-3 py-2">
                                    <p className="text-xs leading-relaxed text-slate-700">
                                      <span className="font-semibold text-legal-950">Nexo jurídico: </span>
                                      {result.connection}
                                    </p>
                                    {matchedTerms.length > 0 && (
                                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                        <span className="text-[11px] text-slate-500">Conceptos detectados:</span>
                                        {matchedTerms.map((term) => (
                                          <span key={term} className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                                            {term}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                <p className={cn('mt-2.5 whitespace-pre-line font-serif text-[15px] leading-7 text-slate-800', !isExpanded && 'line-clamp-5')}>{result.content}</p>
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(turn.id, id)}
                                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-legal-950"
                                  aria-expanded={isExpanded}
                                >
                                  <ChevronDown size={14} className={cn('transition-transform', isExpanded && 'rotate-180')} aria-hidden="true" />
                                  {isExpanded ? 'Ver menos' : 'Ver completo'}
                                </button>

                                {relatedRefs.length > 0 && (
                                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
                                    <span className="text-[11px] font-medium text-slate-500">Artículos correlacionados en el texto:</span>
                                    {relatedRefs.map((ref) => (
                                      <button
                                        key={ref.query}
                                        type="button"
                                        disabled={busy}
                                        onClick={() => void consult(ref.query, module ?? turn.area)}
                                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-legal-950 transition-colors hover:border-legal-gold hover:bg-amber-50/50 disabled:opacity-50"
                                      >
                                        <Compass size={11} className="text-legal-gold" aria-hidden="true" />
                                        {ref.law_code} · {ref.article_number}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                                  {result.law_code && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setReaderTarget({ lawCode: result.law_code!, articleRef: result.article_number ?? result.subtitle ?? null })}
                                    >
                                      <BookOpen size={14} aria-hidden="true" /> Ver en ley
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

                      {turn.relatedQueries && turn.relatedQueries.length > 0 && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3.5">
                          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            <Compass size={13} className="text-legal-gold" aria-hidden="true" />
                            Buscar artículos relacionados en el corpus
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {turn.relatedQueries.map((item) => (
                              <button
                                key={item.query}
                                type="button"
                                disabled={busy}
                                onClick={() => void consult(item.query, turn.area)}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:border-legal-950 hover:bg-slate-100 hover:text-legal-950 disabled:opacity-50"
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <form
        className="border-t border-slate-200 bg-legal-paper px-4 py-3 sm:px-6"
        onSubmit={(event) => { event.preventDefault(); void consult(draft); }}
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-sm text-slate-600">Materia</span>
            <RadioGroup
              label="Materia de la consulta"
              value={area}
              onChange={setArea}
              className="flex flex-wrap gap-1.5"
              optionClassName={(selected) => cn(
                'h-8 rounded-lg border px-2.5 text-[13px] font-medium transition-colors',
                selected ? 'border-legal-950 bg-legal-950 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
              )}
              options={(['todos', ...LEGAL_AREAS] as const).map((item) => ({ value: item, label: item === 'todos' ? 'Todas' : LEGAL_AREA_INFO[item].shortLabel }))}
            />
          </div>
          {area !== 'todos' && <p className="mt-1.5 text-xs leading-5 text-slate-500">{LEGAL_AREA_INFO[area].laws}</p>}
          <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-end">
            <TextArea
              value={draft}
              rows={2}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void consult(draft);
                }
              }}
              placeholder="Escribe el tema de la consulta"
              aria-label="Mensaje para el buscador"
              className="min-h-12 flex-1 resize-none"
            />
            <Button type="submit" className="w-full sm:w-auto" disabled={!draft.trim() || busy} isLoading={busy}>Consultar</Button>
          </div>
        </div>
      </form>

      <LawReaderDialog
        lawCode={readerTarget?.lawCode ?? null}
        articleRef={readerTarget?.articleRef ?? null}
        onClose={() => setReaderTarget(null)}
        onUseArticle={(citation, lawArea) => {
          setReaderTarget(null);
          sendArticleToDraft(citation, lawArea);
        }}
      />
    </div>
  );
}

