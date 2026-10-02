import React, { useId } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { AreaTag, Button, Callout, Card, Field, FileDropzone, SectionTitle, Select, TextArea, TextInput } from '../../components/ui';
import { SUGGESTED_CLAUSES } from '../../lib/drafting';
import { LEGAL_AREA_INFO, LEGAL_AREAS, type LegalArea } from '../../lib/legal-areas';
import type { DraftSession } from '../../store/useWorkspaceStore';

interface DraftDetailsProps {
  draft: DraftSession;
  generating: boolean;
  providerName: string;
  canGenerate: boolean;
  onChange: (patch: Partial<DraftSession>) => void;
  onGenerate: () => void;
  onOpenTemplate: () => void;
  onChangeSource: () => void;
  onError: (message: string) => void;
}

const SOURCE_TITLES: Record<DraftSession['source'], string> = {
  template: 'Plantilla',
  file: 'Documento a partir de tu archivo',
  free: 'Redacción sin plantilla',
  review: 'Adenda o cláusula a partir de una revisión',
};

export function DraftDetails({ draft, generating, providerName, canGenerate, onChange, onGenerate, onOpenTemplate, onChangeSource, onError }: DraftDetailsProps) {
  const instructionsId = useId();
  const areaId = useId();
  const { template } = draft;

  const setField = (field: string, value: string) => onChange({ fieldValues: { ...draft.fieldValues, [field]: value } });
  const addClause = (clause: string) => {
    const line = `Incluir cláusula de ${clause.toLowerCase()}.`;
    onChange({ instructions: draft.instructions.trim() ? `${draft.instructions.trim()}\n${line}` : line });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-6">
        <Card>
          <SectionTitle
            title={template ? template.title : SOURCE_TITLES[draft.source]}
            description={template ? template.description : undefined}
            actions={<Button variant="ghost" size="sm" onClick={onChangeSource}>Cambiar</Button>}
          />
          {template ? (
            <AreaTag area={draft.area} />
          ) : (
            <Field label="Materia" htmlFor={areaId} hint="Determina qué leyes del corpus se usan como fundamento.">
              <Select id={areaId} value={draft.area} onChange={(event) => onChange({ area: event.target.value as LegalArea })} className="max-w-xs">
                {LEGAL_AREAS.map((area) => <option key={area} value={area}>{LEGAL_AREA_INFO[area].label}</option>)}
              </Select>
            </Field>
          )}
          {draft.source === 'review' && draft.sourceReview && (
            <Callout tone="info" className="mt-4" title={`Basado en la revisión de «${draft.sourceReview.title}»`}>
              Los hallazgos de la revisión se incluyen como contexto para el redactor.
            </Callout>
          )}
        </Card>

        {template && (
          <Card>
            <SectionTitle title="Datos del documento" description="Lo que dejes vacío aparecerá como [DATO FALTANTE] en el borrador." />
            <div className="grid gap-4 md:grid-cols-2">
              {template.requiredFields.map((field, index) => {
                const id = `${instructionsId}-field-${index}`;
                return (
                  <Field key={field} label={field} htmlFor={id}>
                    <TextInput id={id} value={draft.fieldValues[field] ?? ''} onChange={(event) => setField(field, event.target.value)} />
                  </Field>
                );
              })}
            </div>
          </Card>
        )}

        {(draft.source === 'file' || draft.source === 'review') && (
          <Card>
            <SectionTitle
              title={draft.source === 'file' ? 'Documento base' : 'Documento revisado (opcional)'}
              description={draft.source === 'file' ? 'El redactor lo usará como punto de partida.' : 'Adjúntalo si quieres que la adenda cite su texto.'}
            />
            <FileDropzone
              file={draft.referenceFile}
              onFile={(file) => onChange({ referenceFile: file })}
              onError={onError}
              title="Arrastra el documento o elígelo"
              compact
            />
          </Card>
        )}

        <Card>
          <Field
            label={template ? 'Instrucciones adicionales' : draft.source === 'file' ? '¿Qué cambios necesitas?' : 'Describe el documento'}
            htmlFor={instructionsId}
            optional={Boolean(template)}
            hint="Indica partes, montos, plazos y condiciones especiales. No incluyas información que no quieras enviar a tu proveedor de IA."
          >
            <TextArea
              id={instructionsId}
              rows={7}
              value={draft.instructions}
              onChange={(event) => onChange({ instructions: event.target.value })}
              placeholder={draft.source === 'file'
                ? 'Ejemplo: actualizar la vigencia a 24 meses y agregar una cláusula de confidencialidad.'
                : 'Ejemplo: contrato de prestación de servicios de consultoría entre ACME y Beta por 12 meses.'}
            />
          </Field>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Agregar:</span>
            {SUGGESTED_CLAUSES.map((clause) => (
              <button
                key={clause}
                type="button"
                onClick={() => addClause(clause)}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Plus size={12} aria-hidden="true" /> {clause}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="space-y-3">
          <Button isFullWidth size="lg" onClick={onGenerate} isLoading={generating} disabled={generating || !canGenerate}>
            {!generating && <Sparkles size={18} aria-hidden="true" />}
            {generating ? 'Redactando…' : 'Redactar con IA'}
          </Button>
          <p className="text-xs leading-relaxed text-slate-500">
            {generating
              ? `${providerName} está redactando. Puede tardar uno o dos minutos.`
              : canGenerate
                ? `Se enviarán tus datos, instrucciones y los artículos aplicables del corpus local a ${providerName}. El resultado se guarda en tu portafolio.`
                : draft.source === 'file' && !draft.referenceFile
                  ? 'Adjunta el documento base para continuar.'
                  : 'Completa al menos un dato o una instrucción.'}
          </p>
          {template && (
            <>
              <div className="border-t border-slate-100" />
              <Button isFullWidth variant="secondary" onClick={onOpenTemplate} disabled={generating}>Abrir machote sin IA</Button>
              <p className="text-xs leading-relaxed text-slate-500">Abre el texto completo de la plantilla para llenarlo a mano. Los datos de este formulario no se trasladan.</p>
            </>
          )}
        </Card>
      </aside>
    </div>
  );
}
