import React, { useId } from 'react';
import { Check, SearchCheck, ShieldCheck } from 'lucide-react';
import { Badge, Button, Callout, Card, Field, FileDropzone, TextArea } from '../../components/ui';
import { LEGAL_AREA_INFO, LEGAL_AREAS, type LegalArea } from '../../lib/legal-areas';
import { BASIC_REVIEW_LIMITS, BASIC_REVIEW_SCOPE } from '../../lib/review';
import { cn } from '../../lib/utils';
import type { ReviewSession } from '../../store/useWorkspaceStore';

interface ReviewSetupProps {
  review: ReviewSession;
  aiReady: boolean;
  providerName: string;
  reviewAvailable: boolean;
  unavailableReason?: string;
  onChange: (patch: Partial<ReviewSession>) => void;
  onStart: () => void;
  onConnectAi: () => void;
  onError: (message: string) => void;
}

export function ReviewSetup({ review, aiReady, providerName, reviewAvailable, unavailableReason, onChange, onStart, onConnectAi, onError }: ReviewSetupProps) {
  const instructionId = useId();
  const allSelected = review.areas.length === LEGAL_AREAS.length;
  const startLabel = aiReady ? 'Revisar documento' : 'Hacer revisión básica';
  const canStart = Boolean(review.file) && reviewAvailable;

  const toggleArea = (area: LegalArea) => {
    const selected = review.areas.includes(area);
    if (selected && review.areas.length === 1) return;
    onChange({ areas: selected ? review.areas.filter((item) => item !== area) : [...review.areas, area] });
  };

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-legal-950">{reviewAvailable ? 'Todo listo para revisar' : 'La revisión no está disponible por ahora'}</p>
            <p className="text-xs text-slate-500">
              {aiReady ? `Revisión con IA mediante ${providerName}` : 'Revisión básica en tu computadora, sin IA'}
            </p>
          </div>
        </div>
        <Badge tone={reviewAvailable ? 'success' : 'warning'} className="px-3 py-1 uppercase tracking-wider">
          {reviewAvailable ? 'LISTO' : 'VERIFICAR'}
        </Badge>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card>
            <StepHeading title="1. Documento" subtitle="Elige o arrastra el archivo a revisar: PDF, Word o texto" />
            <FileDropzone
              file={review.file}
              onFile={(file) => onChange({ file })}
              onError={onError}
              title="Arrastra el contrato o escrito a revisar"
            />
          </Card>

          <Card>
            <StepHeading
              title="2. Materias"
              subtitle="Elige contra qué leyes se revisa el documento"
              actions={(
                <Button size="sm" variant="ghost" onClick={() => onChange({ areas: allSelected ? [review.areas[0]] : [...LEGAL_AREAS] })}>
                  {allSelected ? 'Sólo la primera' : 'Todas las materias'}
                </Button>
              )}
            />
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {LEGAL_AREAS.map((area) => {
                const info = LEGAL_AREA_INFO[area];
                const selected = review.areas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    onClick={() => toggleArea(area)}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all',
                      selected
                        ? 'border-blue-600 bg-blue-50/35 ring-1 ring-blue-600/20'
                        : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60',
                    )}
                  >
                    <span className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                      selected ? 'border-legal-950 bg-legal-950 text-white' : 'border-slate-300 bg-white',
                    )}>
                      {selected && <Check size={13} aria-hidden="true" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold leading-snug text-legal-950">{info.label}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-500">{info.laws}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">Mantén al menos una materia seleccionada; la última no se puede desmarcar.</p>
          </Card>

          {aiReady && (
            <Card>
              <Field
                label="3. Enfoque de la revisión"
                htmlFor={instructionId}
                optional
                hint="Por ejemplo: revisar penas convencionales, vigencia de poderes y causales de rescisión."
              >
                <TextArea id={instructionId} rows={3} value={review.instruction} onChange={(event) => onChange({ instruction: event.target.value })} />
              </Field>
            </Card>
          )}

          {/* Con la columna lateral abajo (menos de 1280 px), la acción queda fija al pie de la pantalla (U-06). */}
          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-card backdrop-blur xl:hidden">
            <p className="min-w-0 truncate text-xs text-slate-500">{review.file ? review.file.name : 'Primero elige el documento.'}</p>
            <Button onClick={onStart} disabled={!canStart}>
              <SearchCheck size={18} aria-hidden="true" /> {startLabel}
            </Button>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <Card className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-legal-golddark">
                <SearchCheck size={18} aria-hidden="true" />
              </span>
              <h2 className="text-base font-bold leading-snug text-legal-950">
                {aiReady ? `Revisión con IA · ${providerName}` : 'Revisión básica (sin IA)'}
              </h2>
            </div>
            {aiReady ? (
              <p className="text-sm leading-relaxed text-slate-600">
                Se envían a {providerName} partes del documento y los artículos que aplican. Cada observación se comprueba contra esas fuentes antes de mostrarse.
              </p>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-slate-600">Señala qué temas y apartados contiene el documento. No opina sobre si es legal.</p>
                {/* Sin IA el límite de la revisión básica se muestra abierto (U-01). */}
                <details open className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-sm text-slate-600">
                  <summary className="cursor-pointer font-semibold text-slate-700">Alcance y límites</summary>
                  <ul className="mt-3 list-disc space-y-2 pl-5">
                    {BASIC_REVIEW_SCOPE.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <p className="mt-3 leading-relaxed">{BASIC_REVIEW_LIMITS}</p>
                </details>
              </>
            )}
            {!reviewAvailable && <Callout tone="warning">{unavailableReason}</Callout>}
            <div className="hidden space-y-2 xl:block">
              <Button isFullWidth size="lg" onClick={onStart} disabled={!canStart}>
                <SearchCheck size={18} aria-hidden="true" /> {startLabel}
              </Button>
              {!review.file && <p className="text-center text-xs text-slate-500">Primero elige el documento.</p>}
            </div>
            {!aiReady && <Button size="sm" variant="secondary" isFullWidth onClick={onConnectAi}>Conectar IA</Button>}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function StepHeading({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
      <div>
        <h2 className="text-base font-bold text-legal-950">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

