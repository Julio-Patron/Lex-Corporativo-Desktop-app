import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clipboard, Download, FileSignature, Search, X } from 'lucide-react';
import { AreaTag, Button, Modal, Spinner, TextInput } from '../../components/ui';
import { filterArticles, findArticle, formatArticleCitation, parseLawMarkdown, type ParsedLaw } from '../../lib/law-reader';
import type { LegalArea } from '../../lib/legal-areas';
import { cn } from '../../lib/utils';
import { useUiStore } from '../../store/useUiStore';

interface LawReaderDialogProps {
  lawCode: string | null;
  articleRef?: string | null;
  onClose: () => void;
  onUseArticle?: (citation: string, area: LegalArea) => void;
}

interface LoadedLaw extends ParsedLaw {
  code: string;
  name: string;
  module: LegalArea;
}

export function LawReaderDialog({ lawCode, articleRef, onClose, onUseArticle }: LawReaderDialogProps) {
  const notify = useUiStore((state) => state.notify);
  const titleId = useId();
  const [law, setLaw] = useState<LoadedLaw | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // El padre suele pasar una función nueva en cada render; no debe recargar la ley.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!lawCode) {
      setLaw(null);
      return;
    }
    let active = true;
    setLoading(true);
    setFilter('');
    window.lexDesktop.legalCorpus.read({ code: lawCode })
      .then((response) => {
        if (!active) return;
        const parsed = parseLawMarkdown(response.content);
        setLaw({ ...parsed, code: response.code, name: response.name, module: response.module });
        const target = findArticle(parsed.articles, articleRef) ?? parsed.articles[0];
        setSelectedKey(target?.key ?? null);
        if (articleRef && !findArticle(parsed.articles, articleRef)) {
          notify(`No se localizó "${articleRef}" en ${response.code}; se muestra el inicio de la ley.`, 'info');
        }
      })
      .catch((error: any) => {
        if (!active) return;
        notify(error?.message || `No se pudo abrir ${lawCode}.`, 'error', 'Lector de leyes');
        onCloseRef.current();
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lawCode, articleRef, notify]);

  const visible = useMemo(() => (law ? filterArticles(law.articles, filter) : []), [law, filter]);
  const index = law?.articles.findIndex((article) => article.key === selectedKey) ?? -1;
  const article = index >= 0 ? law!.articles[index] : null;

  const copyCitation = async () => {
    if (!law || !article) return;
    await navigator.clipboard.writeText(formatArticleCitation(article, law.name, law.code));
    notify('Cita copiada.', 'success');
  };

  const download = async () => {
    if (!law) return;
    try {
      const result = await window.lexDesktop.legalCorpus.download({ code: law.code });
      if (result.success) notify(`${law.name} guardada en Markdown.`, 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo descargar la ley.', 'error');
    }
  };

  if (!lawCode) return null;

  return (
    <Modal isOpen onClose={onClose} labelledBy={titleId} className="flex h-[88vh] max-w-6xl flex-col p-0">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div className="min-w-0">
          {law && <div className="flex items-center gap-2"><AreaTag area={law.module} /><span className="text-xs font-semibold text-slate-500">{law.code}</span></div>}
          <h2 id={titleId} className="mt-1 text-lg font-semibold text-slate-950">{law?.name ?? 'Abriendo ley…'}</h2>
          {law && (
            <p className="mt-0.5 text-xs text-slate-500">
              {law.articles.length.toLocaleString('es-MX')} disposiciones
              {law.metadata['Verificación oficial'] && ` · Verificada contra la fuente oficial el ${law.metadata['Verificación oficial']}`}
              {law.metadata['Última reforma indicada en la fuente'] && ` · Última reforma: ${law.metadata['Última reforma indicada en la fuente']}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => void download()} disabled={!law}>
            <Download size={15} aria-hidden="true" /> Descargar
          </Button>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar lector">
            <X size={18} />
          </button>
        </div>
      </header>

      {loading || !law ? (
        <Spinner label="Abriendo el texto de la ley…" />
      ) : (
        <div className="grid min-h-0 flex-1 md:grid-cols-[280px_minmax(0,1fr)]">
          <nav className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50 md:border-b-0 md:border-r" aria-label="Índice de artículos">
            <div className="border-b border-slate-200 p-3">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" aria-hidden="true" />
                <TextInput
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Número o palabra: 47, rescisión"
                  aria-label="Buscar dentro de la ley"
                  className="pl-8"
                />
              </div>
              {filter && <p className="mt-2 text-xs text-slate-500">{visible.length} coincidencias</p>}
            </div>
            <ul className="max-h-48 min-h-0 flex-1 overflow-y-auto p-2 md:max-h-none">
              {visible.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(item.key)}
                    className={cn(
                      'w-full truncate rounded-md px-3 py-1.5 text-left text-sm',
                      item.key === selectedKey ? 'bg-legal-950 font-semibold text-white' : 'text-slate-700 hover:bg-white',
                    )}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <section className="flex min-h-0 flex-col">
            {article ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
                  <h3 className="font-serif text-xl font-bold text-slate-950">{article.label}</h3>
                  <p className="mt-4 whitespace-pre-line font-serif text-[15px] leading-relaxed text-slate-800">{article.body}</p>
                </div>
                <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-6 py-3">
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" disabled={index <= 0} onClick={() => setSelectedKey(law.articles[index - 1].key)}>
                      <ChevronLeft size={16} aria-hidden="true" /> Anterior
                    </Button>
                    <Button size="sm" variant="ghost" disabled={index >= law.articles.length - 1} onClick={() => setSelectedKey(law.articles[index + 1].key)}>
                      Siguiente <ChevronRight size={16} aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => void copyCitation()}>
                      <Clipboard size={15} aria-hidden="true" /> Copiar cita
                    </Button>
                    {onUseArticle && (
                      <Button size="sm" onClick={() => onUseArticle(formatArticleCitation(article, law.name, law.code), law.module)}>
                        <FileSignature size={15} aria-hidden="true" /> Usar en documento
                      </Button>
                    )}
                  </div>
                </footer>
              </>
            ) : (
              <p className="p-8 text-sm text-slate-600">Esta ley no contiene disposiciones con el formato esperado.</p>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
