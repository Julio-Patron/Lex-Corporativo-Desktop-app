import React, { useMemo, useState } from 'react';
import { Eye, FilePlus2, Search, Upload } from 'lucide-react';
import { AreaTag, Button, Card, EmptyState, TextInput } from '../../components/ui';
import { searchTemplates, type CatalogTemplate } from '../../lib/drafting';
import { LEGAL_AREA_INFO, LEGAL_AREAS, type LegalArea } from '../../lib/legal-areas';
import { cn } from '../../lib/utils';
import { TemplatePreviewDialog } from './TemplatePreviewDialog';

interface TemplateChooserProps {
  aiReady: boolean;
  onCustomize: (template: CatalogTemplate) => void;
  onOpenTemplate: (template: CatalogTemplate) => void;
  onStartFromFile: () => void;
  onStartFree: () => void;
}

export function TemplateChooser({ aiReady, onCustomize, onOpenTemplate, onStartFromFile, onStartFree }: TemplateChooserProps) {
  const [query, setQuery] = useState('');
  const [area, setArea] = useState<LegalArea | 'todas'>('todas');
  const [preview, setPreview] = useState<CatalogTemplate | null>(null);
  const templates = useMemo(() => searchTemplates(query, area), [query, area]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        <button type="button" onClick={onStartFromFile} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-card hover:border-slate-300">
          <Upload size={20} className="mt-0.5 shrink-0 text-legal-950" aria-hidden="true" />
          <span>
            <span className="block text-sm font-semibold text-slate-950">Partir de mi propio archivo</span>
            <span className="mt-0.5 block text-sm text-slate-600">Sube un documento y describe los cambios. Requiere IA.</span>
          </span>
        </button>
        <button type="button" onClick={onStartFree} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-card hover:border-slate-300">
          <FilePlus2 size={20} className="mt-0.5 shrink-0 text-legal-950" aria-hidden="true" />
          <span>
            <span className="block text-sm font-semibold text-slate-950">Redactar sin plantilla</span>
            <span className="mt-0.5 block text-sm text-slate-600">Describe el documento que necesitas. Requiere IA.</span>
          </span>
        </button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" aria-hidden="true" />
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar plantilla: pagaré, arrendamiento, confidencialidad…"
              aria-label="Buscar plantilla"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Filtrar por materia">
            {(['todas', ...LEGAL_AREAS] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={area === value}
                onClick={() => setArea(value)}
                className={cn(
                  'h-9 rounded-lg border px-3 text-sm font-semibold transition-colors',
                  area === value ? 'border-legal-950 bg-legal-950 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                )}
              >
                {value === 'todas' ? 'Todas' : LEGAL_AREA_INFO[value].shortLabel}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-500">{templates.length} plantillas</p>
      </Card>

      {templates.length === 0 ? (
        <EmptyState icon={Search} title="No hay plantillas con ese nombre" description="Prueba con otra palabra o redacta sin plantilla." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <li key={template.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <AreaTag area={template.area} />
                {template.intentGroup && <span className="truncate text-xs text-slate-500">{template.intentGroup}</span>}
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-950">{template.title}</p>
              <p className="mt-1 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">{template.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {aiReady ? (
                  <>
                    <Button size="sm" onClick={() => onCustomize(template)}>Personalizar</Button>
                    <Button size="sm" variant="secondary" onClick={() => onOpenTemplate(template)}>Machote</Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={() => onOpenTemplate(template)}>Abrir machote</Button>
                    <Button size="sm" variant="secondary" onClick={() => onCustomize(template)}>Con IA</Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={() => setPreview(template)} aria-label={`Ver ${template.title}`}>
                  <Eye size={15} aria-hidden="true" /> Ver
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <TemplatePreviewDialog
        template={preview}
        onClose={() => setPreview(null)}
        onOpenTemplate={(template) => { setPreview(null); onOpenTemplate(template); }}
        onCustomize={(template) => { setPreview(null); onCustomize(template); }}
      />
    </div>
  );
}
