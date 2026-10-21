import { useState } from 'react';

import { Button, ConfirmDialog, Page } from '../../components/ui';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useAiGuard } from '../../hooks/useAiGuard';
import { exportMarkdown } from '../../hooks/usePortfolioActions';
import { buildDraftRequirements, documentTitleFrom, hasDraftInput, hasUnsavedDraft, templateArea, type CatalogTemplate } from '../../lib/drafting';
import { toFilePayload } from '../../lib/files';
import { LEGAL_AREA_INFO } from '../../lib/legal-areas';
import { newRecordId, saveDraftRecord } from '../../lib/portfolio';
import { getFullTemplateBody } from '../../lib/template-bodies';
import { cn } from '../../lib/utils';
import { providerLabel, useUiStore } from '../../store/useUiStore';
import { useWorkspaceStore, type DraftStep } from '../../store/useWorkspaceStore';
import type { DraftRecord } from '../../types';
import { DraftDetails } from './DraftDetails';
import { DraftDocument } from './DraftDocument';
import { TemplateChooser } from './TemplateChooser';

const STEPS: Array<{ id: DraftStep; label: string }> = [
  { id: 'choose', label: 'Elegir documento' },
  { id: 'details', label: 'Completar datos' },
  { id: 'document', label: 'Revisar y exportar' },
];

function Stepper({ current, canOpen, onSelect, manual }: { current: DraftStep; canOpen: (step: DraftStep) => boolean; onSelect: (step: DraftStep) => void; manual: boolean }) {
  const steps = manual ? [STEPS[0], { id: 'document' as const, label: 'Completar y exportar' }] : STEPS;
  return (
    <ol className="flex flex-wrap items-end gap-x-6 gap-y-2 border-b border-slate-200" aria-label="Pasos de redacción">
      {steps.map((step, index) => {
        const active = step.id === current;
        const open = canOpen(step.id) && !active;
        return (
          <li key={step.id} className="-mb-px">
            <button
              type="button"
              disabled={!open}
              onClick={() => onSelect(step.id)}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'border-b-2 pb-2 font-serif text-xl font-medium leading-none disabled:cursor-default',
                active ? 'border-legal-gold text-legal-950' : open ? 'border-transparent text-slate-600 hover:text-legal-950' : 'border-transparent text-slate-400',
              )}
            >
              {index + 1}. {step.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default function DraftingPage() {
  const draft = useWorkspaceStore((state) => state.draft);
  const updateDraft = useWorkspaceStore((state) => state.updateDraft);
  const startDraft = useWorkspaceStore((state) => state.startDraft);
  const setDraftDocument = useWorkspaceStore((state) => state.setDraftDocument);
  const editDraftDocument = useWorkspaceStore((state) => state.editDraftDocument);
  const resetDraft = useWorkspaceStore((state) => state.resetDraft);
  const notify = useUiStore((state) => state.notify);
  const provider = useUiStore((state) => state.settings?.provider);
  const { aiReady, ensureAi } = useAiGuard();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogState, confirm] = useConfirmDialog();

  const replaceDraft = async (action: () => void) => {
    const current = useWorkspaceStore.getState().draft;
    if (hasUnsavedDraft(current) && !await confirm({
      title: 'Descartar cambios sin guardar',
      message: 'Hay trabajo sin guardar en la redacción actual. Si continúas, se descartará. Puedes cancelar para conservarlo y guardarlo.',
      confirmLabel: 'Descartar cambios',
      variant: 'danger',
    })) return;
    action();
  };

  const requirementsInput = {
    template: draft.template,
    fieldValues: draft.fieldValues,
    instructions: draft.instructions,
    hasReferenceFile: Boolean(draft.referenceFile),
    source: draft.source,
  };
  const canGenerate = draft.source === 'file'
    ? Boolean(draft.referenceFile) && Boolean(draft.instructions.trim())
    : draft.source === 'review'
      ? Boolean(draft.instructions.trim())
      : hasDraftInput(requirementsInput);

  const openTemplate = (template: CatalogTemplate | NonNullable<typeof draft.template>) => void replaceDraft(() => {
    const area = templateArea(template);
    const now = new Date().toISOString();
    const record: DraftRecord = {
      id: newRecordId('doc'),
      title: template.title,
      area,
      timestamp: now,
      updatedAt: now,
      source: 'template',
      templateId: template.id,
      instructions: '',
      document: getFullTemplateBody(template),
      generatedWith: 'template',
    };
    updateDraft({ template, area, source: 'template' });
    setDraftDocument(record);
  });

  const customize = (template: CatalogTemplate) => {
    void replaceDraft(() => startDraft('template', { template, area: template.area }));
  };

  const generate = async () => {
    if (!ensureAi('redactar el documento')) return;
    const initialRecordId = draft.record?.id;
    setGenerating(true);
    try {
      const { template, area } = draft;
      const requirements = buildDraftRequirements(requirementsInput)
        || `Redactar una adenda que subsane los hallazgos de la revisión de «${draft.sourceReview?.title ?? 'documento'}».`;
      const response = await window.lexDesktop.drafts.generateDraft({
        requirements,
        ecosystem: area,
        workflowModule: 'drafting',
        promptProfile: `${area}_drafting`,
        templateId: template?.id,
        template: template
          ? { id: template.id, title: template.title, prompt: template.prompt, fields: template.fields, output: template.output, body: getFullTemplateBody(template) }
          : undefined,
        referenceFile: draft.referenceFile ? await toFilePayload(draft.referenceFile) : undefined,
        sourceAnalysisId: draft.sourceReview?.id,
        caseId: draft.sourceReview?.caseId,
      });
      const latestBeforeSet = useWorkspaceStore.getState().draft;
      if (latestBeforeSet.step === 'document' && latestBeforeSet.record?.id !== initialRecordId) return;
      const now = new Date().toISOString();
      const fallbackTitle = template?.title
        ?? (draft.source === 'review' ? `Adenda: ${draft.sourceReview?.title ?? 'revisión'}` : draft.referenceFile?.name ?? 'Documento');
      const record: DraftRecord = {
        id: newRecordId('doc'),
        title: template?.title ?? documentTitleFrom(response.result, fallbackTitle),
        area,
        timestamp: now,
        updatedAt: now,
        source: draft.source,
        templateId: template?.id,
        referenceFileName: draft.referenceFile?.name,
        sourceReviewId: draft.sourceReview?.id,
        instructions: requirements,
        document: response.result,
        generatedWith: 'ai',
        provider: response.provider,
      };
      setDraftDocument(record);
      try {
        const saved = await saveDraftRecord(record);
        const current = useWorkspaceStore.getState().draft;
        if (current.record?.id === record.id) updateDraft({
          record: { ...current.record, caseId: saved.caseId, updatedAt: saved.updatedAt },
          dirty: current.record.document !== record.document || current.record.title !== record.title,
        });
        notify('El borrador quedó guardado en tu portafolio.', 'success', 'Documento redactado');
      } catch (error: any) {
        notify(error?.message || 'El borrador se generó, pero no se pudo guardar.', 'warning', 'Documento sin guardar');
      }
    } catch (error: any) {
      notify(error?.message || 'No se pudo redactar el documento.', 'error', 'Redacción');
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!draft.record) return;
    const snapshot = draft.record;
    setSaving(true);
    try {
      const saved = await saveDraftRecord(snapshot);
      const current = useWorkspaceStore.getState().draft;
      if (current.record?.id !== snapshot.id) return;
      updateDraft({
        record: { ...current.record, caseId: saved.caseId, updatedAt: saved.updatedAt },
        dirty: current.record.document !== snapshot.document || current.record.title !== snapshot.title,
      });
      notify('Guardado en tu portafolio. Los cambios siguientes se guardan solos.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo guardar el documento.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const exportDocument = async (format: 'pdf' | 'docx') => {
    if (!draft.record) return;
    try {
      const area = LEGAL_AREA_INFO[draft.record.area];
      const saved = await exportMarkdown({
        markdown: draft.record.document,
        title: draft.record.title,
        subtitle: `Materia: ${area.label}`,
        filenamePrefix: 'Documento',
        areaLabel: area.shortLabel,
      }, format);
      if (saved) notify(format === 'pdf' ? 'PDF guardado.' : 'Documento de Word guardado.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo exportar el documento.', 'error');
    }
  };

  const copyDocument = async () => {
    if (!draft.record) return;
    try {
      await navigator.clipboard.writeText(draft.record.document);
    } catch {
      notify('No se pudo copiar al portapapeles.', 'warning');
    }
  };

  const canOpenStep = (step: DraftStep) => step === 'choose'
    || (step === 'details' && draft.step !== 'choose')
    || (step === 'document' && Boolean(draft.record));

  return (
    <Page
      title="Generar"
      hideTitle
      description={draft.step === 'choose' ? 'Solicita un documento a la IA, parte de un archivo o utiliza una plantilla.' : undefined}
      width="wide"
      actions={draft.step !== 'choose' && <Button variant="secondary" onClick={() => void replaceDraft(resetDraft)} disabled={generating || saving}>Nuevo documento</Button>}
    >
      {draft.record?.generatedWith !== 'manual' && <Stepper current={draft.step} manual={draft.record?.generatedWith === 'template'} canOpen={(step) => !generating && !saving && canOpenStep(step)} onSelect={(step) => updateDraft({ step })} />}

      {draft.step === 'choose' && (
        <TemplateChooser
          aiReady={aiReady}
          onCustomize={customize}
          onOpenTemplate={openTemplate}
          onStartFromFile={() => void replaceDraft(() => startDraft('file', { area: draft.area }))}
          onStartFree={() => void replaceDraft(() => startDraft('free', { area: draft.area }))}
        />
      )}

      {draft.step === 'details' && (
        <DraftDetails
          draft={draft}
          generating={generating}
          providerName={providerLabel(provider)}
          canGenerate={canGenerate}
          onChange={updateDraft}
          onGenerate={() => void generate()}
          onOpenTemplate={() => draft.template && openTemplate(draft.template)}
          onChangeSource={() => updateDraft({ step: 'choose' })}
          onError={(message) => notify(message, 'warning')}
        />
      )}

      {draft.step === 'document' && draft.record && (
        <DraftDocument
          record={draft.record}
          dirty={draft.dirty}
          saving={saving}
          onChangeDocument={editDraftDocument}
          onRename={(title) => updateDraft({ record: { ...draft.record!, title }, dirty: true })}
          onSave={() => void save()}
          onExport={exportDocument}
          onCopy={copyDocument}
          onEditDetails={draft.template || draft.instructions ? () => updateDraft({ step: 'details' }) : undefined}
        />
      )}
      <ConfirmDialog {...dialogState} />
    </Page>
  );
}
