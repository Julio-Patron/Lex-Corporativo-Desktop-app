import type { ByokProviderId, LegalArea } from '../preload/types';

export type NotificationType = 'error' | 'success' | 'info' | 'warning';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
}

export interface LegalFoundation {
  id: string;
  title: string;
  law: string;
  article?: string;
  excerpt?: string;
  relevanceScore?: number;
}

export interface ReviewRisk {
  title: string;
  severity: 'low' | 'medium' | 'high';
  explanation: string;
  relatedClauses?: string[];
  legalFoundations?: LegalFoundation[];
  // Referencia normativa orientativa de la revisión básica (no recuperada del corpus).
  reference?: string;
}

// Elemento mínimo verificado por la revisión básica: sólo indica si el texto lo menciona.
export interface ReviewCheck {
  id: string;
  materia: LegalArea;
  label: string;
  found: boolean;
}

export interface ReviewResult {
  reviewMode?: 'ai' | 'basic';
  summary: string;
  documentType: string;
  riskScore: number;
  detectedParties: string[];
  detectedObligations: string[];
  missingClauses: string[];
  missingData?: string[];
  checks?: ReviewCheck[];
  risks: ReviewRisk[];
  recommendedActions: string[];
  checklist?: string[];
  riskCategories?: Record<string, string[] | undefined>;
  legalFoundations: LegalFoundation[];
  confidence?: 'low' | 'medium' | 'high';
  engine?: string;
}

export type ReviewMode = 'ai' | 'basic';

export interface ReviewRecord {
  id: string;
  caseId?: string;
  title: string;
  fileName: string;
  areas: LegalArea[];
  timestamp: string;
  instruction: string;
  reviewMode: ReviewMode;
  basicReason?: 'no_api_key' | 'ai_error';
  provider?: ByokProviderId;
  result: ReviewResult;
}

export type DraftSource = 'template' | 'file' | 'free' | 'review';

export interface DraftRecord {
  id: string;
  caseId?: string;
  title: string;
  area: LegalArea;
  timestamp: string;
  updatedAt: string;
  source: DraftSource;
  templateId?: string;
  referenceFileName?: string;
  sourceReviewId?: string;
  instructions: string;
  document: string;
  generatedWith: 'ai' | 'template';
  provider?: ByokProviderId;
}

export type PortfolioItem =
  | { kind: 'draft'; caseId: string; record: DraftRecord }
  | { kind: 'review'; caseId: string; record: ReviewRecord };
