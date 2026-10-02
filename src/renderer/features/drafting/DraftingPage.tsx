import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Button, Page } from '../../components/ui';
import { useAiGuard } from '../../hooks/useAiGuard';
import { exportMarkdown } from '../../hooks/usePortfolioActions';
import { buildDraftRequirements, documentTitleFrom, hasDraftInput, templateArea, type CatalogTemplate } from '../../lib/drafting';
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

function Stepper({ current, canOpen, onSelect }: { current: DraftStep; canOpen: (step: DraftStep) => boolean; onSelect: (step: DraftStep) => void }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Pasos de redacción">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = step.id === current;
        return (
          <li key={step.id} className="flex items-center gap-2">
            {index > 0 && <span className="h-px w-6 bg-slate-300" aria-hidden="true" />}
            <button
              type="button"
              disabled={!canOpen(step.id) || active}
              onClick={() => onSelect(step.id)}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-default',
                active ? 'bg-legal-950 text-white' : done ? 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100' : 'text-slate-500',
              )}
            >
              <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-xs', active ? 'bg-white/20' : 'bg-slate-200 text-slate-700')}>
                {done ? <Check size={12} aria-hidden="true" /> : index + 1}
              </span>
              {step.label}
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

  const requirementsInput = {
    template: draft.template,
    fieldValues: draft.fieldValues,
    instructions: draft.instructions,
    hasReferenceFile: Boolean(draft.referenceFile),
  };
  const canGenerate = draft.source === 'file'
    ? Boolean(draft.referenceFile) && Boolean(draft.instructions.trim())
    : hasDraftInput(requirementsInput) || draft.source === 'review';

  const openTemplate = (template: CatalogTemplate | NonNullable<typeof draft.template>) => {
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
  };

  const customize = (template: CatalogTemplate) => {
    startDraft('template', { template, area: template.area });
  };

  const generate = async () => {
    if (!ensureAi('redactar el documento')) return;
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
          ? { id: template.id, title: template.title, prompt: template.prompt, requiredFields: template.requiredFields, output: template.output }
          : undefined,
        referenceFile: draft.referenceFile ? await toFilePayload(draft.referenceFile) : undefined,
        sourceAnalysisId: draft.sourceReview?.id,
        caseId: draft.sourceReview?.caseId,
      });
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
      try {
        setDraftDocument(await saveDraftRecord(record), { saved: true });
        notify('El borrador quedó guardado en tu portafolio.', 'success', 'Documento redactado');
      } catch (error: any) {
        setDraftDocument(record);
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
    setSaving(true);
    try {
      setDraftDocument(await saveDraftRecord(draft.record), { saved: true });
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
      title="Redactar"
      description="Elige un documento, completa sus datos y obtén el borrador listo para revisar y exportar."
      width="wide"
      actions={draft.step !== 'choose' && <Button variant="secondary" onClick={resetDraft} disabled={generating}>Nuevo documento</Button>}
    >
      <Stepper current={draft.step} canOpen={canOpenStep} onSelect={(step) => updateDraft({ step })} />

      {draft.step === 'choose' && (
        <TemplateChooser
          aiReady={aiReady}
          onCustomize={customize}
          onOpenTemplate={openTemplate}
          onStartFromFile={() => startDraft('file', { area: draft.area })}
          onStartFree={() => startDraft('free', { area: draft.area })}
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
    </Page>
  );
}
