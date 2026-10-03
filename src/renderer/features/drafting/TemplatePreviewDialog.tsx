import React, { useId, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { X } from 'lucide-react';
import { AreaTag, Button, Modal } from '../../components/ui';
import type { CatalogTemplate } from '../../lib/drafting';
import { getFullTemplateBody } from '../../lib/template-bodies';

interface TemplatePreviewDialogProps {
  template: CatalogTemplate | null;
  onClose: () => void;
  onOpenTemplate: (template: CatalogTemplate) => void;
  onCustomize: (template: CatalogTemplate) => void;
}

export function TemplatePreviewDialog({ template, onClose, onOpenTemplate, onCustomize }: TemplatePreviewDialogProps) {
  const titleId = useId();
  const body = useMemo(() => (template ? getFullTemplateBody(template) : ''), [template]);
  if (!template) return null;

  return (
    <Modal isOpen onClose={onClose} labelledBy={titleId} className="flex max-h-[90vh] max-w-4xl flex-col p-0">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div className="min-w-0">
          <AreaTag area={template.area} />
          <h2 id={titleId} className="mt-2 text-lg font-semibold text-slate-950">{template.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{template.description}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar vista previa">
          <X size={18} />
        </button>
      </header>
      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-[minmax(0,1fr)_260px]">
        <article className="prose-legal min-h-0 overflow-y-auto px-8 py-6">
          <ReactMarkdown>{body}</ReactMarkdown>
        </article>
        <aside className="overflow-y-auto border-t border-slate-200 bg-slate-50 px-5 py-5 md:border-l md:border-t-0">
          <p className="text-sm font-semibold text-slate-900">Datos que pide</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {template.fields.map((field) => <li key={field.id}>{field.label}</li>)}
          </ul>
        </aside>
      </div>
      <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-6 py-4">
        <Button variant="secondary" onClick={() => onOpenTemplate(template)}>Abrir documento sin IA</Button>
        <Button onClick={() => onCustomize(template)}>Personalizar con IA</Button>
      </footer>
    </Modal>
  );
}
