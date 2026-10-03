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
            <span className="block text-sm font-semibold text-legal-950">Partir de mi propio archivo</span>
            <span className="mt-0.5 block text-sm text-slate-600">Sube un documento y describe los cambios. Requiere IA.</span>
          </span>
        </button>
        <button type="button" onClick={onStartFree} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-card hover:border-slate-300">
          <FilePlus2 size={20} className="mt-0.5 shrink-0 text-legal-950" aria-hidden="true" />
          <span>
            <span className="block text-sm font-semibold text-legal-950">Redactar sin documento base</span>
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
              placeholder="Buscar documento base: pagaré, arrendamiento, confidencialidad…"
              aria-label="Buscar documento base"
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
        <p className="mt-3 text-sm text-slate-500">{templates.length} documentos base</p>
      </Card>

      {templates.length === 0 ? (
        <EmptyState icon={Search} title="No hay documentos base con ese nombre" description="Prueba con otra palabra o redacta sin documento base." />
      ) : (
        <div className="space-y-8">
          {LEGAL_AREAS.map((a) => {
            const areaTemplates = templates.filter(t => t.area === a);
            if (areaTemplates.length === 0) return null;
            return (
              <section key={a} className="space-y-4">
                <h3 className="text-lg font-bold text-legal-950 border-b border-slate-200 pb-2">{LEGAL_AREA_INFO[a].label}</h3>
                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {areaTemplates.map((template) => (
                    <li key={template.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-shadow hover:shadow-md">
                      <div className="flex items-center justify-between gap-2">
                        <AreaTag area={template.area} />
                        {template.intentGroup && <span className="truncate text-xs font-medium text-slate-500 uppercase tracking-wider">{template.intentGroup}</span>}
                      </div>
                      <p className="mt-4 text-base font-semibold text-legal-950 leading-tight">{template.title}</p>
                      <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-600 leading-relaxed">{template.description}</p>
                      <div className="mt-5 flex flex-wrap items-center gap-2 pt-4 border-t border-slate-50">
                        {aiReady ? (
                          <>
                            <Button size="sm" onClick={() => onCustomize(template)}>Redactar con IA</Button>
                            <Button size="sm" variant="secondary" onClick={() => onOpenTemplate(template)}>Abrir documento</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" onClick={() => onOpenTemplate(template)}>Abrir documento</Button>
                            <Button size="sm" variant="secondary" onClick={() => onCustomize(template)}>Con IA</Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setPreview(template)} aria-label={`Ver ${template.title}`}>
                          <Eye size={15} aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
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
