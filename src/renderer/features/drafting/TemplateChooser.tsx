import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, FilePlus2, Search, Upload } from 'lucide-react';
import { AreaTag, Button, Card, EmptyState, RadioGroup, TextInput } from '../../components/ui';
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
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={onStartFromFile}
          className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-card transition-all hover:border-slate-300 hover:shadow-md"
        >
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-legal-golddark">
              <Upload size={18} aria-hidden="true" />
            </span>
            <span className="mt-3.5 block text-base font-bold leading-snug text-legal-950">Partir de mi propio archivo</span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-500">
              Sube un contrato o documento base para adaptarlo, perfeccionar cláusulas o generar un derivado con IA.
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
            <span>Requiere IA</span>
            <span className="inline-flex items-center gap-1 text-legal-950 group-hover:translate-x-0.5 transition-transform">
              Abrir <ArrowRight size={13} aria-hidden="true" />
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onStartFree}
          className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-card transition-all hover:border-slate-300 hover:shadow-md"
        >
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FilePlus2 size={18} aria-hidden="true" />
            </span>
            <span className="mt-3.5 block text-base font-bold leading-snug text-legal-950">Solicitar un documento a la IA</span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-500">
              Redacta contratos, convenios, actas o escritos corporativos desde cero con fundamento en el corpus local.
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
            <span>Requiere IA</span>
            <span className="inline-flex items-center gap-1 text-legal-950 group-hover:translate-x-0.5 transition-transform">
              Abrir <ArrowRight size={13} aria-hidden="true" />
            </span>
          </div>
        </button>
      </div>

      <p className="text-xs text-slate-500 sm:text-sm">
        Para preparar una corrección desde una revisión, abre el informe en{' '}
        <Link to="/estudio/auditar" className="font-semibold text-legal-950 underline">Auditar</Link> o recupéralo del{' '}
        <Link to="/estudio/portafolio" className="font-semibold text-legal-950 underline">Portafolio</Link>.
      </p>

      <details className="rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <summary className="cursor-pointer px-5 py-4 text-base font-bold text-legal-950">Usar una plantilla precargada</summary>
        <div className="space-y-5 border-t border-slate-100 px-5 py-5">
          <Card className="bg-slate-50/60 shadow-none">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-0 flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" aria-hidden="true" />
                <TextInput
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar plantilla por nombre"
                  aria-label="Buscar documento base"
                  className="bg-white pl-9"
                />
              </div>
              <RadioGroup
                label="Filtrar por materia"
                value={area}
                onChange={setArea}
                className="flex flex-wrap gap-1.5"
                optionClassName={(selected) => cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all',
                  selected ? 'border-legal-950 bg-legal-950 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                )}
                options={(['todas', ...LEGAL_AREAS] as const).map((value) => ({ value, label: value === 'todas' ? 'Todas' : LEGAL_AREA_INFO[value].shortLabel }))}
              />
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">{templates.length} documentos base</p>
          </Card>

          {templates.length === 0 ? (
            <EmptyState icon={Search} title="No hay documentos base con ese nombre" description="Prueba con otra palabra o redacta sin documento base." />
          ) : (
            <div className="space-y-8">
              {LEGAL_AREAS.map((a) => {
                const areaTemplates = templates.filter((t) => t.area === a);
                if (areaTemplates.length === 0) return null;
                return (
                  <section key={a} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h2 className="text-base font-bold text-legal-950">{LEGAL_AREA_INFO[a].label}</h2>
                      <AreaTag area={a} />
                    </div>
                    <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {areaTemplates.map((template) => (
                        <li key={template.id} className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
                          <h3 className="text-base font-bold leading-snug text-legal-950">{template.title}</h3>
                          <p className="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-500">{template.description}</p>
                          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3.5">
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
        </div>
      </details>

      <TemplatePreviewDialog
        template={preview}
        onClose={() => setPreview(null)}
        onOpenTemplate={(template) => { setPreview(null); onOpenTemplate(template); }}
        onCustomize={(template) => { setPreview(null); onCustomize(template); }}
      />
    </div>
  );
}

