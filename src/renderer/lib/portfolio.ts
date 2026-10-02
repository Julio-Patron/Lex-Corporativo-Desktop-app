import type { CaseMetadata } from '../../preload/types';
import type { DraftRecord, PortfolioItem, ReviewRecord, ReviewResult } from '../types';
import { isLegalArea, LEGAL_AREAS, type LegalArea } from './legal-areas';

// Cada entregable vive en su propio asunto del portafolio. Los asuntos creados
// por versiones anteriores ("activity_engineering", "engineering_…") pueden
// agrupar varios elementos y se leen igualmente.
const DRAFT_CASE_PREFIX = 'doc_';
const REVIEW_CASE_PREFIX = 'rev_';

export function newRecordId(prefix: 'doc' | 'rev'): string {
  return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

function isOwnCase(caseId: string | undefined, prefix: string): caseId is string {
  return Boolean(caseId && caseId.startsWith(prefix));
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asArea(value: unknown, fallback: LegalArea = 'mercantil'): LegalArea {
  return isLegalArea(value) ? value : fallback;
}

function toIsoDate(value: unknown, fallback: string): string {
  const date = new Date(typeof value === 'string' || value instanceof Date ? value : fallback);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

export function normalizeDraftRecord(raw: any, caseId: string, fallbackDate: string): DraftRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const document = asString(raw.document) || asString(raw.generatedDoc);
  const timestamp = toIsoDate(raw.timestamp, fallbackDate);
  return {
    id: asString(raw.id) || asString(raw.requestId) || `${caseId}-${timestamp}`,
    caseId,
    title: asString(raw.title) || asString(raw.templateTitle) || asString(raw.referenceFileName) || 'Documento sin título',
    area: asArea(raw.area ?? raw.ecosystem),
    timestamp,
    updatedAt: toIsoDate(raw.updatedAt ?? raw.timestamp, fallbackDate),
    source: raw.source === 'template' || raw.source === 'file' || raw.source === 'review' || raw.source === 'free'
      ? raw.source
      : raw.sourceAnalysisId ? 'review' : raw.referenceFileName ? 'file' : raw.templateId ? 'template' : 'free',
    templateId: asString(raw.templateId) || undefined,
    referenceFileName: asString(raw.referenceFileName) || undefined,
    sourceReviewId: asString(raw.sourceReviewId) || asString(raw.sourceAnalysisId) || undefined,
    instructions: asString(raw.instructions) || asString(raw.prompt),
    document,
    generatedWith: raw.generatedWith === 'template' ? 'template' : 'ai',
    provider: raw.provider,
  };
}

function normalizeReviewResult(raw: any): ReviewResult {
  const result = raw && typeof raw === 'object' ? raw : {};
  const list = (value: unknown) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []);
  return {
    ...result,
    summary: asString(result.summary),
    documentType: asString(result.documentType),
    riskScore: Number(result.riskScore) || 0,
    detectedParties: list(result.detectedParties),
    detectedObligations: list(result.detectedObligations),
    missingClauses: list(result.missingClauses),
    missingData: list(result.missingData),
    risks: Array.isArray(result.risks) ? result.risks : [],
    recommendedActions: list(result.recommendedActions),
    checklist: list(result.checklist),
    legalFoundations: Array.isArray(result.legalFoundations) ? result.legalFoundations : [],
  };
}

export function normalizeReviewRecord(raw: any, caseId: string, fallbackDate: string): ReviewRecord | null {
  if (!raw || typeof raw !== 'object' || !raw.result) return null;
  const fileName = asString(raw.fileName) || asString(raw.files?.[0]?.name) || 'Documento';
  const areas = Array.isArray(raw.areas)
    ? raw.areas.filter(isLegalArea)
    : raw.ecosystem === 'integral'
      ? [...LEGAL_AREAS]
      : [asArea(raw.ecosystem)];
  const result = normalizeReviewResult(raw.result);
  // Los dictámenes guardados antes de existir la revisión básica provienen del proveedor de IA
  // salvo que el motor local los haya marcado.
  const reviewMode = raw.reviewMode === 'basic' || result.reviewMode === 'basic' || result.engine === 'local_rules' ? 'basic' : 'ai';
  return {
    id: asString(raw.id) || asString(raw.requestId) || `${caseId}-${fallbackDate}`,
    caseId,
    title: asString(raw.title) || `Revisión de ${fileName}`,
    fileName,
    areas: areas.length > 0 ? areas : ['mercantil'],
    timestamp: toIsoDate(raw.timestamp, fallbackDate),
    instruction: asString(raw.instruction) || asString(raw.customInstruction),
    reviewMode,
    basicReason: raw.basicReason,
    provider: raw.provider,
    result: { ...result, reviewMode },
  };
}

export function portfolioItemsFromCase(caseData: any, metadata: CaseMetadata): PortfolioItem[] {
  const fallbackDate = metadata.updatedAt || metadata.createdAt || new Date().toISOString();
  const drafts = (Array.isArray(caseData?.drafts) ? caseData.drafts : [])
    .map((raw: any) => normalizeDraftRecord(raw, metadata.caseId, fallbackDate))
    .filter((record: DraftRecord | null): record is DraftRecord => Boolean(record && record.document.trim()))
    .map((record: DraftRecord) => ({ kind: 'draft' as const, caseId: metadata.caseId, record }));
  const reviews = (Array.isArray(caseData?.analyses) ? caseData.analyses : [])
    .map((raw: any) => normalizeReviewRecord(raw, metadata.caseId, fallbackDate))
    .filter((record: ReviewRecord | null): record is ReviewRecord => Boolean(record))
    .map((record: ReviewRecord) => ({ kind: 'review' as const, caseId: metadata.caseId, record }));
  return [...drafts, ...reviews];
}

export function portfolioItemDate(item: PortfolioItem): string {
  return item.kind === 'draft' ? item.record.updatedAt : item.record.timestamp;
}

export async function listPortfolio(): Promise<{ items: PortfolioItem[]; cases: CaseMetadata[] }> {
  const cases = await window.lexDesktop.cases.listCases();
  const groups = await Promise.all(cases.map(async (metadata) => {
    try {
      return portfolioItemsFromCase(await window.lexDesktop.cases.getCase(metadata.caseId), metadata);
    } catch {
      return [];
    }
  }));
  const items = groups.flat().sort((a, b) => portfolioItemDate(b).localeCompare(portfolioItemDate(a)));
  return { items, cases };
}

export async function saveDraftRecord(record: DraftRecord): Promise<DraftRecord> {
  const previousCaseId = record.caseId;
  const caseId = isOwnCase(previousCaseId, DRAFT_CASE_PREFIX) ? previousCaseId : newRecordId('doc');
  const { caseId: _caseId, ...draftData } = { ...record, updatedAt: new Date().toISOString() };
  await window.lexDesktop.cases.createCase({ caseId, name: record.title.slice(0, 96) || 'Documento', module: 'engineering' });
  await window.lexDesktop.cases.saveDraft({ caseId, draftId: record.id, draftData });
  // Un documento abierto desde un asunto heredado se traslada a su propio asunto.
  if (previousCaseId && previousCaseId !== caseId) {
    await window.lexDesktop.cases.deleteDraft({ caseId: previousCaseId, draftId: record.id }).catch(() => undefined);
  }
  return { ...record, ...draftData, caseId };
}

export async function saveReviewRecord(record: ReviewRecord): Promise<ReviewRecord> {
  const caseId = isOwnCase(record.caseId, REVIEW_CASE_PREFIX) ? record.caseId : newRecordId('rev');
  const { caseId: _caseId, ...analysisData } = record;
  await window.lexDesktop.cases.createCase({ caseId, name: record.title.slice(0, 96) || 'Revisión', module: 'engineering' });
  await window.lexDesktop.cases.saveAnalysis({ caseId, analysisId: record.id, analysisData });
  return { ...record, caseId };
}

export async function deletePortfolioItem(item: PortfolioItem): Promise<void> {
  const ownCase = item.kind === 'draft'
    ? isOwnCase(item.caseId, DRAFT_CASE_PREFIX)
    : isOwnCase(item.caseId, REVIEW_CASE_PREFIX);
  if (ownCase) {
    await window.lexDesktop.cases.deleteCase(item.caseId);
    return;
  }
  if (item.kind === 'draft') {
    await window.lexDesktop.cases.deleteDraft({ caseId: item.caseId, draftId: item.record.id });
  } else {
    await window.lexDesktop.cases.deleteAnalysis({ caseId: item.caseId, analysisId: item.record.id });
  }
}
