import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateDocumentDocx } from '../lib/docx-export';
import { LEGAL_AREA_INFO } from '../lib/legal-areas';
import { generateDocumentPDF } from '../lib/pdf-export';
import { buildReviewReport } from '../lib/review';
import { useUiStore } from '../store/useUiStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import type { PortfolioItem } from '../types';

export type ExportFormat = 'pdf' | 'docx';

export interface ExportRequest {
  markdown: string;
  title: string;
  subtitle: string;
  filenamePrefix: string;
  areaLabel: string;
}

export async function exportMarkdown(request: ExportRequest, format: ExportFormat): Promise<boolean> {
  const result = format === 'pdf'
    ? await generateDocumentPDF(request.markdown, request.title, request.subtitle, request.filenamePrefix)
    : await generateDocumentDocx(request.markdown, {
      title: request.title,
      subtitle: request.subtitle,
      filenamePrefix: request.filenamePrefix,
      ecosystem: request.areaLabel,
    });
  return Boolean(result.success);
}

export function exportRequestFor(item: PortfolioItem): ExportRequest {
  if (item.kind === 'draft') {
    const area = LEGAL_AREA_INFO[item.record.area];
    return {
      markdown: item.record.document,
      title: item.record.title,
      subtitle: `Materia: ${area.label}`,
      filenamePrefix: 'Documento',
      areaLabel: area.shortLabel,
    };
  }
  const areas = item.record.areas.map((area) => LEGAL_AREA_INFO[area].shortLabel).join(', ');
  return {
    markdown: buildReviewReport(item.record),
    title: item.record.title,
    subtitle: `Materias: ${areas}`,
    filenamePrefix: 'Revision',
    areaLabel: areas,
  };
}

export function usePortfolioActions() {
  const navigate = useNavigate();
  const notify = useUiStore((state) => state.notify);

  const openItem = useCallback((item: PortfolioItem) => {
    const workspace = useWorkspaceStore.getState();
    if (item.kind === 'draft') {
      workspace.resetDraft();
      workspace.setDraftDocument({ ...item.record, caseId: item.caseId }, { saved: true });
      navigate('/redactar');
    } else {
      workspace.openReview({ ...item.record, caseId: item.caseId });
      navigate('/revisar');
    }
  }, [navigate]);

  const exportItem = useCallback(async (item: PortfolioItem, format: ExportFormat) => {
    try {
      const saved = await exportMarkdown(exportRequestFor(item), format);
      if (saved) notify(format === 'pdf' ? 'PDF guardado.' : 'Documento de Word guardado.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo exportar.', 'error');
    }
  }, [notify]);

  return { openItem, exportItem };
}
