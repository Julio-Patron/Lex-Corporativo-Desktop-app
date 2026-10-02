import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Card, Page } from '../../components/ui';
import { useAiGuard } from '../../hooks/useAiGuard';
import { exportMarkdown } from '../../hooks/usePortfolioActions';
import { toFilePayload } from '../../lib/files';
import { LEGAL_AREA_INFO } from '../../lib/legal-areas';
import { newRecordId, saveReviewRecord } from '../../lib/portfolio';
import { buildAddendumInstructions, buildClauseInstructions, buildReviewReport } from '../../lib/review';
import { providerLabel, useUiStore } from '../../store/useUiStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import type { LegalFoundation, ReviewRecord, ReviewResult } from '../../types';
import { LawReaderDialog } from '../laws/LawReaderDialog';
import { useSendArticleToDraft } from '../laws/useSendArticleToDraft';
import { ReviewResultView } from './ReviewResultView';
import { ReviewSetup } from './ReviewSetup';

const PROGRESS_STEPS = ['Extrayendo texto', 'Identificando cláusulas', 'Buscando fundamentos', 'Analizando', 'Validando'];

export default function ReviewPage() {
  const navigate = useNavigate();
  const review = useWorkspaceStore((state) => state.review);
  const updateReview = useWorkspaceStore((state) => state.updateReview);
  const resetReview = useWorkspaceStore((state) => state.resetReview);
  const startDraftFromReview = useWorkspaceStore((state) => state.startDraftFromReview);
  const updateDraft = useWorkspaceStore((state) => state.updateDraft);
  const notify = useUiStore((state) => state.notify);
  const provider = useUiStore((state) => state.settings?.provider);
  const health = useUiStore((state) => state.runtimeHealth);
  const requestProcessingSetup = useUiStore((state) => state.requestProcessingSetup);
  const { aiReady, ensureAi } = useAiGuard();
  const sendArticleToDraft = useSendArticleToDraft();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ step: number; label: string } | null>(null);
  const [reader, setReader] = useState<{ code: string; article?: string } | null>(null);

  useEffect(() => {
    const off = window.lexDesktop.analysis.onProgress((state) => setProgress({ step: state.step, label: state.label }));
    return off;
  }, []);

  const capability = health?.capabilities.documentReview;

  const start = async () => {
    if (!review.file) return;
    setRunning(true);
    setProgress({ step: 1, label: 'Extrayendo texto' });
    try {
      const file = review.file;
      const areas = review.areas;
      const response = await window.lexDesktop.analysis.analyzeDocument({
        files: [await toFilePayload(file)],
        focusedInstruction: review.instruction.trim() || undefined,
        ecosystem: areas[0],
        ecosystems: areas,
        module: 'analysis',
        currentDocumentOnly: true,
      });
      const result = JSON.parse(response.result) as ReviewResult;
      const record: ReviewRecord = {
        id: newRecordId('rev'),
        title: `Revisión de ${file.name}`,
        fileName: file.name,
        areas,
        timestamp: new Date().toISOString(),
        instruction: review.instruction.trim(),
        reviewMode: response.reviewMode,
        basicReason: response.basicReason,
        provider: response.provider,
        result: { ...result, reviewMode: response.reviewMode },
      };
      try {
        updateReview({ record: await saveReviewRecord(record) });
      } catch (error: any) {
        updateReview({ record });
        notify(error?.message || 'La revisión terminó, pero no se pudo guardar.', 'warning');
      }
      if (response.reviewMode === 'basic' && response.basicReason === 'ai_error') {
        notify('La IA no respondió a tiempo o rechazó la solicitud. Se muestra la revisión básica.', 'warning', 'Revisión');
      }
    } catch (error: any) {
      notify(error?.message || 'No se pudo revisar el documento.', 'error', 'Revisión');
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  const draftFrom = (instructions: string) => {
    if (!review.record || !ensureAi('redactar la corrección')) return;
    startDraftFromReview(review.record, instructions);
    if (review.file) updateDraft({ referenceFile: review.file });
    navigate('/redactar');
  };

  const openFoundation = (foundation: LegalFoundation) => setReader({ code: foundation.law, article: foundation.article });

  const exportReport = async (format: 'pdf' | 'docx') => {
    if (!review.record) return;
    const areas = review.record.areas.map((area) => LEGAL_AREA_INFO[area].shortLabel).join(', ');
    try {
      const saved = await exportMarkdown({
        markdown: buildReviewReport(review.record),
        title: review.record.title,
        subtitle: `Materias: ${areas}`,
        filenamePrefix: 'Revision',
        areaLabel: areas,
      }, format);
      if (saved) notify(format === 'pdf' ? 'Informe guardado en PDF.' : 'Informe guardado en Word.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo exportar el informe.', 'error');
    }
  };

  return (
    <Page title="Revisar" description="Sube un documento para detectar riesgos, omisiones y cláusulas faltantes." width="wide">
      {running ? (
        <Card className="mx-auto max-w-xl py-10 text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-legal-950" aria-hidden="true" />
          <p className="mt-4 text-base font-semibold text-slate-950">{progress?.label ?? 'Procesando'}…</p>
          <p className="mt-1 text-sm text-slate-600">{aiReady ? `Con ${providerLabel(provider)} puede tardar uno o dos minutos.` : 'La revisión básica tarda unos segundos.'}</p>
          <ol className="mx-auto mt-6 flex max-w-md justify-between text-xs text-slate-500" aria-label="Avance">
            {PROGRESS_STEPS.map((label, index) => (
              <li key={label} className={index + 1 <= (progress?.step ?? 1) ? 'font-semibold text-legal-950' : ''}>{label}</li>
            ))}
          </ol>
        </Card>
      ) : review.record ? (
        <ReviewResultView
          record={review.record}
          aiReady={aiReady}
          onDraftAddendum={() => draftFrom(buildAddendumInstructions(review.record!))}
          onDraftClause={(finding) => draftFrom(buildClauseInstructions(finding))}
          onOpenFoundation={openFoundation}
          onExport={exportReport}
          onCopy={() => navigator.clipboard.writeText(buildReviewReport(review.record!)).catch(() => notify('No se pudo copiar al portapapeles.', 'warning'))}
          onNewReview={resetReview}
          onConnectAi={() => requestProcessingSetup('hacer una revisión completa con IA')}
        />
      ) : (
        <ReviewSetup
          review={review}
          aiReady={aiReady}
          providerName={providerLabel(provider)}
          reviewAvailable={capability?.ready ?? true}
          unavailableReason={capability?.detail}
          onChange={updateReview}
          onStart={() => void start()}
          onConnectAi={() => requestProcessingSetup('hacer una revisión completa con IA')}
          onError={(message) => notify(message, 'warning')}
        />
      )}

      <LawReaderDialog
        lawCode={reader?.code ?? null}
        articleRef={reader?.article}
        onClose={() => setReader(null)}
        onUseArticle={(citation, area) => { setReader(null); sendArticleToDraft(citation, area); }}
      />
    </Page>
  );
}
