import React, { useId, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Check, Clipboard, Download, FileText, Save } from 'lucide-react';
import logoMarkUrl from '../../assets/logo-mark.png';
import { AreaTag, Badge, Button, Callout, Card, Segmented, TextInput } from '../../components/ui';
import { LEGAL_AREA_INFO } from '../../lib/legal-areas';
import type { DraftRecord } from '../../types';

interface DraftDocumentProps {
  record: DraftRecord;
  dirty: boolean;
  onChangeDocument: (document: string) => void;
  onRename: (title: string) => void;
  onSave: () => void;
  onExport: (format: 'pdf' | 'docx') => Promise<void>;
  onCopy: () => Promise<void>;
  onEditDetails?: () => void;
  saving: boolean;
}

// Cuenta los datos pendientes marcados entre corchetes en el machote o el borrador.
function countPlaceholders(document: string): number {
  return (document.match(/\[[^\]\n]{2,}\]/g) ?? []).length;
}

export function DraftDocument({ record, dirty, onChangeDocument, onRename, onSave, onExport, onCopy, onEditDetails, saving }: DraftDocumentProps) {
  const [view, setView] = useState<'preview' | 'edit'>(record.generatedWith === 'template' ? 'edit' : 'preview');
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);
  const [copied, setCopied] = useState(false);
  const titleId = useId();
  const saved = Boolean(record.caseId);
  const pending = countPlaceholders(record.document);

  const runExport = async (format: 'pdf' | 'docx') => {
    setExporting(format);
    try {
      await onExport(format);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-[240px] flex-1">
          <label htmlFor={titleId} className="sr-only">Título del documento</label>
          <TextInput id={titleId} value={record.title} onChange={(event) => onRename(event.target.value)} className="font-semibold" />
        </div>
        <AreaTag area={record.area} />
        {saved
          ? <Badge tone={dirty ? 'neutral' : 'success'}>{dirty ? 'Guardando…' : 'Guardado'}</Badge>
          : <Badge tone="warning">Sin guardar</Badge>}
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Modo de visualización"
            value={view}
            onChange={setView}
            options={[{ value: 'preview', label: 'Vista' }, { value: 'edit', label: 'Editar' }]}
          />
          {!saved && (
            <Button size="sm" onClick={onSave} isLoading={saving}>
              {!saving && <Save size={15} aria-hidden="true" />} Guardar
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => { void onCopy().then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}>
            {copied ? <Check size={15} aria-hidden="true" /> : <Clipboard size={15} aria-hidden="true" />} Copiar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void runExport('pdf')} isLoading={exporting === 'pdf'} disabled={exporting !== null}>
            {exporting !== 'pdf' && <Download size={15} aria-hidden="true" />} PDF
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void runExport('docx')} isLoading={exporting === 'docx'} disabled={exporting !== null}>
            {exporting !== 'docx' && <FileText size={15} aria-hidden="true" />} Word
          </Button>
        </div>
      </Card>

      {pending > 0 && (
        <Callout tone="warning" title={`Quedan ${pending} datos por completar`}>
          Busca los textos entre corchetes, por ejemplo [NOMBRE DEL ARRENDADOR], y reemplázalos en el modo Editar.
          {onEditDetails && record.generatedWith === 'ai' && (
            <> También puedes <button type="button" className="font-semibold underline" onClick={onEditDetails}>volver a los datos</button> y redactar de nuevo.</>
          )}
        </Callout>
      )}

      {view === 'preview' ? (
        <article className="legal-letterhead mx-auto max-w-4xl rounded-xl px-10 py-10">
          <header className="mb-6 flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div className="flex items-center gap-2.5">
              <img src={logoMarkUrl} alt="" className="h-8 w-8 object-contain" />
              <span className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900">Lex Corporativo</span>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="font-semibold text-slate-700">{LEGAL_AREA_INFO[record.area].label}</p>
              <p>{new Date(record.updatedAt).toLocaleDateString('es-MX', { dateStyle: 'long' })}</p>
            </div>
          </header>
          <div className="prose-legal select-text">
            <ReactMarkdown>{record.document}</ReactMarkdown>
          </div>
        </article>
      ) : (
        <div>
          <textarea
            aria-label="Texto del documento"
            value={record.document}
            onChange={(event) => onChangeDocument(event.target.value)}
            className="min-h-[65vh] w-full rounded-xl border border-slate-300 bg-white p-6 font-mono text-sm leading-relaxed text-slate-900 outline-none focus:border-legal-800 focus:ring-2 focus:ring-legal-gold/30"
          />
          <p className="mt-2 text-xs text-slate-500">Formato Markdown: # para títulos y **texto** para negritas. {record.document.length.toLocaleString('es-MX')} caracteres.</p>
        </div>
      )}
    </div>
  );
}
