export type LegalArea = 'mercantil' | 'laboral' | 'comercio_exterior' | 'aduanal' | 'fiscal';
export type CaseModule = 'engineering' | 'fiscal' | 'mercantil';
export type ByokProviderId = 'gemini' | 'openai' | 'anthropic';
export type ByokKeyStatus = 'missing' | 'ready' | 'unreadable';
export type CaseRetentionDays = 0 | 30 | 90;

export interface ByokProviderState {
  model: string;
  hasApiKey: boolean;
  keyStatus: ByokKeyStatus;
  requiresApiKeyReset: boolean;
  apiKeyFingerprint?: string;
  updatedAt?: string;
}

export interface AppSettings {
  enabled: boolean;
  provider: ByokProviderId;
  model: string;
  strictPrivacy: boolean;
  automaticUpdatesEnabled: boolean;
  maxInputChars: number;
  hasApiKey: boolean;
  keyStatus: ByokKeyStatus;
  requiresApiKeyReset: boolean;
  apiKeyFingerprint?: string;
  updatedAt?: string;
  providers: Record<ByokProviderId, ByokProviderState>;
  updateConsentGiven: boolean;
  caseRetentionDays: CaseRetentionDays;
}

export interface CaseMetadata {
  caseId: string;
  name: string;
  module: CaseModule;
  createdAt: string;
  updatedAt: string;
  retentionUntil?: string | null;
}

export type RuntimeCapabilityId =
  | 'vault'
  | 'legalSearch'
  | 'legalCorpus'
  | 'legalGeneration'
  | 'documentReview'
  | 'rulesAssessment'
  | 'localAssistant';

export interface RuntimeHealth {
  status: 'ready' | 'degraded' | 'blocked';
  checks: Array<{ id: string; label: string; ok: boolean; detail?: string }>;
  capabilities: Record<RuntimeCapabilityId, { ready: boolean; label: string; detail: string }>;
}

export interface AnalyzeResponse {
  result: string;
  requestId: string;
  ecosystem: LegalArea;
  ecosystems: LegalArea[];
  module: 'analysis';
  promptProfile: string;
  currentDocumentOnly: true;
  // 'ai': dictamen del proveedor validado localmente. 'basic': revisión por reglas locales.
  reviewMode: 'ai' | 'basic';
  basicReason?: 'no_api_key' | 'ai_error';
  engine: 'byok' | 'local_rules';
  provider?: ByokProviderId;
  fallbackReason?: string;
}

export interface DraftResponse {
  result: string;
  requestId: string;
  ecosystem: LegalArea;
  module: 'drafting';
  promptProfile: string;
  sourceAnalysisId?: string;
  templateId?: string;
  engine: 'byok';
  provider?: ByokProviderId;
  fallbackReason?: string;
}

export interface LexDesktopAPI {
  cases: {
    createCase: (payload: { caseId: string; name: string; module: CaseModule; description?: string }) => Promise<CaseMetadata>;
    listCases: () => Promise<CaseMetadata[]>;
    getCase: (caseId: string) => Promise<any>;
    renameCase: (payload: { caseId: string; name: string }) => Promise<CaseMetadata>;
    deleteCase: (caseId: string) => Promise<any>;
    saveAnalysis: (payload: { caseId: string; analysisId: string; analysisData: Record<string, any>; expectedModule?: CaseModule }) => Promise<{ success: true }>;
    saveDraft: (payload: { caseId: string; draftId: string; draftData: Record<string, any>; expectedModule?: CaseModule }) => Promise<{ success: true }>;
    deleteAnalysis: (payload: { caseId: string; analysisId: string; expectedModule?: CaseModule }) => Promise<{ success: true; deleted: boolean }>;
    deleteDraft: (payload: { caseId: string; draftId: string; expectedModule?: CaseModule }) => Promise<{ success: true; deleted: boolean }>;
    saveState: (payload: { caseId: string; stateData: Record<string, unknown>; expectedModule?: CaseModule }) => Promise<{ success: true }>;
    purgeExpired: () => Promise<{ deleted: number }>;
    exportAll: () => Promise<{
      success: boolean;
      canceled?: boolean;
      filePath?: string;
      caseCount: number;
      packageHash?: string;
    }>;
    deleteAll: (payload: { confirmation: 'DELETE_ALL_LOCAL_DATA' }) => Promise<{ deleted: number }>;
  };
  documents: {
    selectFile: () => Promise<string[] | null>;
    exportPdf: (payload: { base64: string; defaultPath: string }) => Promise<{ success: boolean; canceled?: boolean; filePath?: string }>;
    exportDocx: (payload: { base64: string; defaultPath: string }) => Promise<{ success: boolean; canceled?: boolean; filePath?: string }>;
  };
  analysis: {
    analyzeDocument: (payload: {
      caseId?: string;
      files: Array<{ name: string; mimeType: string; base64: string }>;
      focusedInstruction?: string;
      ecosystem?: LegalArea;
      ecosystems?: LegalArea[];
      module?: 'analysis';
      currentDocumentOnly?: true;
      promptProfile?: string;
    }) => Promise<AnalyzeResponse>;
    onProgress: (callback: (progress: { step: number; label: string; details?: string }) => void) => () => void;
  };
  drafts: {
    generateDraft: (payload: {
      caseId?: string;
      requirements: string;
      module?: LegalArea;
      ecosystem?: LegalArea;
      workflowModule?: 'drafting';
      sourceAnalysisId?: string;
      templateId?: string;
      promptProfile?: `${LegalArea}_drafting`;
      template?: any;
      referenceFile?: {
        name: string;
        mimeType: string;
        base64: string;
      };
    }) => Promise<DraftResponse>;
  };
  legalKnowledge: {
    searchRAG: (payload: {
      query: string;
      module: 'todos' | LegalArea;
      limit?: number;
      useReranker?: boolean;
    }) => Promise<{
      context: string;
      citations: Array<{
        id: string | number;
        title: string;
        subtitle?: string;
        content: string;
        law_code?: string;
        article_number?: string;
        module?: LegalArea;
      }>;
    }>;
  };
  legalCorpus: {
    list: () => Promise<{
      corpusVersion: string;
      lawsCount: number;
      provisionsCount: number;
      laws: Array<{
        code: string;
        name: string;
        module: LegalArea;
        provisions: number;
        bytes: number;
        sha256: string;
      }>;
    }>;
    download: (payload: { code: string }) => Promise<{
      success: boolean;
      canceled: boolean;
      filePath?: string;
      code?: string;
      sha256?: string;
    }>;
    read: (payload: { code: string }) => Promise<{
      success: boolean;
      code: string;
      name: string;
      module: LegalArea;
      content: string;
      provisions: number;
    }>;
  };
  runtime: {
    getHealth: () => Promise<RuntimeHealth>;
  };
  traceability: {
    getStatus: () => Promise<{ path: string; exists: boolean; size: number }>;
    exportLedger: () => Promise<{
      success: boolean;
      reason?: 'empty' | 'canceled';
      filePath?: string;
      sourcePath: string;
    }>;
  };
  byok: {
    getSettings: () => Promise<AppSettings>;
    saveSettings: (payload: {
      enabled: boolean;
      provider?: ByokProviderId;
      model?: string;
      apiKey?: string;
      maxInputChars?: number;
    }) => Promise<AppSettings>;
    clearKey: (payload?: { provider?: ByokProviderId }) => Promise<AppSettings>;
    testConnection: (payload?: { provider?: ByokProviderId; apiKey?: string; model?: string }) => Promise<{ ok: true; provider: ByokProviderId; model: string }>;
  };
  settings: {
    getAppVersion: () => Promise<string>;
    getPlatform: () => Promise<'win32' | 'darwin' | 'linux'>;
    savePreferences: (payload: {
      strictPrivacy?: boolean;
      automaticUpdatesEnabled?: boolean;
      caseRetentionDays?: CaseRetentionDays;
    }) => Promise<AppSettings>;
    onUpdateAvailable: (callback: (version: string) => void) => () => void;
    onUpdateDownloaded: (callback: () => void) => () => void;
    checkForUpdates: () => Promise<{ ok: boolean; status: string; version?: string; message?: string }>;
    installUpdate: () => void;
  };
  navigation: {
    onSettings: (callback: () => void) => () => void;
  };
  assistant: {
    askInstructivo: (payload: { query: string; history?: Array<{ role: 'user' | 'model' | 'assistant'; text: string }> }) => Promise<{ result: string }>;
  };
  security: {
    reportCspViolation: (report: unknown) => Promise<{ ok: boolean }>;
  };
}
