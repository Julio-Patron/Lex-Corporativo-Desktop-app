import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Clipboard, FileSignature } from 'lucide-react';
import { BrandPlate } from '../../components/BrandWatermark';
import { AreaTag, Button, Callout, RadioGroup, TextArea } from '../../components/ui';
import { LEGAL_AREA_INFO, LEGAL_AREAS, isLegalArea, type LegalArea } from '../../lib/legal-areas';
import { suggestAlternativeLegalModule } from '../../lib/legal-search-routing';
import { cn } from '../../lib/utils';
import { useUiStore } from '../../store/useUiStore';
import { useSendArticleToDraft } from '../laws/useSendArticleToDraft';

type AreaFilter = LegalArea | 'todos';
type Citation = Awaited<ReturnType<typeof window.lexDesktop.legalKnowledge.searchRAG>>['citations'][number];

interface Turn {
  id: number;
  query: string;
  area: AreaFilter;
  status: 'loading' | 'ready' | 'error';
  results: Citation[] | null;
  error: string;
  expanded: string[];
}

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
  const [area, setArea] = useState<AreaFilter>('todos');
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const seq = useRef(0);
  const inflight = useRef(false);
  const busy = turns.some((turn) => turn.status === 'loading');

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const tail = turns.map((turn) => `${turn.id}:${turn.status}`).join('|');
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || turns.length === 0) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [tail, turns.length]);

  const consult = async (value: string, searchArea: AreaFilter = area, existingId?: number) => {
    const text = value.trim();
    if (!text || inflight.current) return;
    inflight.current = true;
    const id = existingId ?? ++seq.current;
    const next: Turn = { id, query: text, area: searchArea, status: 'loading', results: null, error: '', expanded: [] };
    setTurns((current) => existingId ? current.map((turn) => turn.id === id ? next : turn) : [...current, next]);
    if (!existingId) setDraft('');
    try {
      const response = await window.lexDesktop.legalKnowledge.searchRAG({ query: text, module: searchArea, limit: 8, useReranker: true });
      if (!alive.current) return;
      setTurns((current) => current.map((turn) => turn.id === id ? { ...turn, status: 'ready', results: response.citations } : turn));
    } catch (error: unknown) {
      if (!alive.current) return;
      setTurns((current) => current.map((turn) => turn.id === id ? { ...turn, status: 'error', error: errorMessage(error), results: null } : turn));
    } finally {
      inflight.current = false;
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
                            return (
                              <li key={id} className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                  {module && <AreaTag area={module} />}
                                  <span className="text-[15px] font-semibold text-legal-950">{result.law_code ?? result.title}</span>
                                  <span className="text-sm text-slate-500">{result.article_number ?? result.subtitle}</span>
                                </div>
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
                                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
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
    </div>
  );
}
