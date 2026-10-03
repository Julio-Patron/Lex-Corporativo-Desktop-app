import type { AppSettings, LexDesktopAPI } from '../../preload/types';
import { DEFAULT_BYOK_MODELS } from '../../shared/byok-models';

// Simulador en memoria del API del preload para revisar la interfaz en un
// navegador durante el desarrollo. No se incluye en la app empaquetada.
export function installBrowserPreview(): void {
  const cases = new Map<string, { metadata: any; drafts: Map<string, any>; analyses: Map<string, any> }>();
  let settings: AppSettings = {
    enabled: false,
    provider: 'gemini',
    model: DEFAULT_BYOK_MODELS.gemini,
    strictPrivacy: true,
    automaticUpdatesEnabled: false,
    maxInputChars: 60_000,
    hasApiKey: false,
    keyStatus: 'missing',
    requiresApiKeyReset: false,
    providers: {
      gemini: { model: DEFAULT_BYOK_MODELS.gemini, hasApiKey: false, keyStatus: 'missing', requiresApiKeyReset: false },
      openai: { model: DEFAULT_BYOK_MODELS.openai, hasApiKey: false, keyStatus: 'missing', requiresApiKeyReset: false },
      anthropic: { model: DEFAULT_BYOK_MODELS.anthropic, hasApiKey: false, keyStatus: 'missing', requiresApiKeyReset: false },
    },
    updateConsentGiven: false,
    caseRetentionDays: 0,
  };
  const ready = (label: string) => ({ ready: true, label, detail: 'Vista previa de desarrollo.' });
  const noop = () => () => undefined;
  const unavailable = async () => { throw new Error('No disponible en la vista previa del navegador.'); };
  const touch = (caseId: string) => { const item = cases.get(caseId); if (item) item.metadata.updatedAt = new Date().toISOString(); };

  const api: LexDesktopAPI = {
    cases: {
      createCase: async ({ caseId, name, module }) => {
        const now = new Date().toISOString();
        const existing = cases.get(caseId);
        const metadata = { caseId, name, module, createdAt: existing?.metadata.createdAt ?? now, updatedAt: now, retentionUntil: null };
        cases.set(caseId, { metadata, drafts: existing?.drafts ?? new Map(), analyses: existing?.analyses ?? new Map() });
        return metadata;
      },
      listCases: async () => [...cases.values()].map((item) => item.metadata),
      getCase: async (caseId) => {
        const item = cases.get(caseId);
        return { metadata: item?.metadata, drafts: [...(item?.drafts.values() ?? [])], analyses: [...(item?.analyses.values() ?? [])] };
      },
      renameCase: unavailable,
      deleteCase: async (caseId) => { cases.delete(caseId); return { success: true }; },
      saveAnalysis: async ({ caseId, analysisId, analysisData }) => { cases.get(caseId)?.analyses.set(analysisId, analysisData); touch(caseId); return { success: true }; },
      saveDraft: async ({ caseId, draftId, draftData }) => { cases.get(caseId)?.drafts.set(draftId, draftData); touch(caseId); return { success: true }; },
      deleteAnalysis: async ({ caseId, analysisId }) => ({ success: true, deleted: Boolean(cases.get(caseId)?.analyses.delete(analysisId)) }),
      deleteDraft: async ({ caseId, draftId }) => ({ success: true, deleted: Boolean(cases.get(caseId)?.drafts.delete(draftId)) }),
      saveState: async () => ({ success: true }),
      purgeExpired: async () => ({ deleted: 0 }),
      exportAll: async () => ({ success: false, canceled: true, caseCount: cases.size }),
      deleteAll: async () => { const deleted = cases.size; cases.clear(); return { deleted }; },
    },
    documents: {
      selectFile: async () => null,
      exportPdf: async () => ({ success: false, canceled: true }),
      exportDocx: async () => ({ success: false, canceled: true }),
    },
    analysis: { analyzeDocument: unavailable, onProgress: noop },
    drafts: { generateDraft: unavailable },
    legalKnowledge: { searchRAG: async () => ({ context: '', citations: [] }) },
    legalCorpus: {
      list: async () => ({ corpusVersion: 'vista-previa', lawsCount: 0, provisionsCount: 0, laws: [] }),
      download: unavailable,
      read: unavailable,
    },
    runtime: {
      getHealth: async () => ({
        status: 'degraded',
        checks: [],
        capabilities: {
          vault: ready('Portafolio local'),
          legalSearch: ready('Consulta de corpus'),
          legalCorpus: ready('Corpus normativo'),
          legalGeneration: { ready: settings.enabled, label: 'Generación', detail: 'Vista previa de desarrollo.' },
          documentReview: ready('Revisión de documentos'),
          rulesAssessment: ready('Evaluaciones por reglas'),
          localAssistant: { ready: settings.enabled, label: 'Ayuda', detail: 'Vista previa de desarrollo.' },
        },
      }),
    },
    traceability: {
      getStatus: async () => ({ path: '', exists: false, size: 0 }),
      exportLedger: async () => ({ success: false, reason: 'empty', sourcePath: '' }),
    },
    byok: {
      getSettings: async () => settings,
      saveSettings: async (payload) => {
        const provider = payload.provider ?? settings.provider;
        const hasApiKey = Boolean(payload.apiKey) || settings.providers[provider].hasApiKey;
        settings = {
          ...settings,
          enabled: payload.enabled && hasApiKey,
          provider,
          model: payload.model ?? settings.providers[provider].model,
          hasApiKey,
          keyStatus: hasApiKey ? 'ready' : 'missing',
          maxInputChars: payload.maxInputChars ?? settings.maxInputChars,
          providers: { ...settings.providers, [provider]: { ...settings.providers[provider], model: payload.model ?? settings.providers[provider].model, hasApiKey, keyStatus: hasApiKey ? 'ready' : 'missing' } },
        };
        return settings;
      },
      clearKey: async () => { settings = { ...settings, enabled: false, hasApiKey: false, keyStatus: 'missing' }; return settings; },
      testConnection: async (payload) => ({ ok: true, provider: payload?.provider ?? 'gemini', model: payload?.model ?? 'vista-previa' }),
    },
    settings: {
      getAppVersion: async () => '0.0.0-dev',
      getPlatform: async () => 'win32',
      savePreferences: async (payload) => {
        settings = { ...settings, ...payload, automaticUpdatesEnabled: (payload.strictPrivacy ?? settings.strictPrivacy) ? false : payload.automaticUpdatesEnabled ?? settings.automaticUpdatesEnabled };
        return settings;
      },
      onUpdateAvailable: noop,
      onUpdateDownloaded: noop,
      checkForUpdates: async () => ({ ok: false, status: 'dev-mode', message: 'La búsqueda de actualizaciones sólo aplica a la app instalada.' }),
      installUpdate: () => undefined,
    },
    navigation: { onSettings: noop },
    assistant: { askInstructivo: unavailable },
    security: { reportCspViolation: async () => ({ ok: true }) },
  };

  Object.defineProperty(window, 'lexDesktop', { configurable: true, value: api });
}
