import React, { useId } from 'react';
import { Check, SearchCheck } from 'lucide-react';
import { Button, Callout, Card, Field, FileDropzone, SectionTitle, TextArea } from '../../components/ui';
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

  const toggleArea = (area: LegalArea) => {
    const selected = review.areas.includes(area);
    if (selected && review.areas.length === 1) return;
    onChange({ areas: selected ? review.areas.filter((item) => item !== area) : [...review.areas, area] });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-6">
        <Card>
          <SectionTitle title="1. Documento" />
          <FileDropzone
            file={review.file}
            onFile={(file) => onChange({ file })}
            onError={onError}
            title="Arrastra el contrato o escrito a revisar"
          />
        </Card>

        <Card>
          <SectionTitle
            title="2. Materias"
            actions={(
              <Button size="sm" variant="ghost" onClick={() => onChange({ areas: allSelected ? [review.areas[0]] : [...LEGAL_AREAS] })}>
                {allSelected ? 'Sólo la primera' : 'Todas las materias'}
              </Button>
            )}
          />
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
                    'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    selected ? 'border-legal-950 bg-slate-50 ring-2 ring-legal-gold/30' : 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border', selected ? 'border-legal-950 bg-legal-950 text-white' : 'border-slate-300')}>
                    {selected && <Check size={13} aria-hidden="true" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{info.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{info.laws}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {aiReady && <Card>
          <Field
            label="3. Enfoque de la revisión"
            htmlFor={instructionId}
            optional
            hint="Por ejemplo: revisar penas convencionales, vigencia de poderes y causales de rescisión."
          >
            <TextArea id={instructionId} rows={3} value={review.instruction} onChange={(event) => onChange({ instruction: event.target.value })} />
          </Field>
        </Card>}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-slate-950">{aiReady ? `Revisión con IA · ${providerName}` : 'Revisión básica (sin IA)'}</p>
          {aiReady ? (
            <p className="text-sm leading-relaxed text-slate-600">
              Se envían a {providerName} extractos del documento y los artículos aplicables del corpus local. Cada afirmación del dictamen se valida contra esas fuentes antes de mostrarse.
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-slate-600">Detecta menciones y estructura del texto. No interpreta ni valida la legalidad del documento.</p>
              <details className="text-sm text-slate-600">
                <summary className="cursor-pointer font-semibold text-slate-700">Alcance y límites</summary>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {BASIC_REVIEW_SCOPE.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <p className="mt-3 leading-relaxed">{BASIC_REVIEW_LIMITS}</p>
              </details>
            </>
          )}
          {!reviewAvailable && <Callout tone="warning">{unavailableReason}</Callout>}
          <Button isFullWidth size="lg" onClick={onStart} disabled={!review.file || !reviewAvailable}>
            <SearchCheck size={18} aria-hidden="true" /> {aiReady ? 'Revisar documento' : 'Hacer revisión básica'}
          </Button>
          {!review.file && <p className="text-xs text-slate-500">Primero elige el documento.</p>}
          {!aiReady && <Button size="sm" variant="ghost" isFullWidth onClick={onConnectAi}>Conectar IA</Button>}
        </Card>
      </aside>
    </div>
  );
}
