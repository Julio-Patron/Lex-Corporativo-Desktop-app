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
    recovery: {
      load: async () => ({ sessionId: crypto.randomUUID(), snapshot: null }),
      save: async () => ({ ok: true }),
      flush: () => ({ ok: true }),
    },
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
      deleteCase: async (caseId) => { cases.delete(caseId); return { success: true }; },
      saveAnalysis: async ({ caseId, analysisId, analysisData }) => { cases.get(caseId)?.analyses.set(analysisId, analysisData); touch(caseId); return { success: true }; },
      saveDraft: async ({ caseId, draftId, draftData }) => { cases.get(caseId)?.drafts.set(draftId, draftData); touch(caseId); return { success: true }; },
      deleteAnalysis: async ({ caseId, analysisId }) => ({ success: true, deleted: Boolean(cases.get(caseId)?.analyses.delete(analysisId)) }),
      deleteDraft: async ({ caseId, draftId }) => ({ success: true, deleted: Boolean(cases.get(caseId)?.drafts.delete(draftId)) }),
      exportAll: async () => ({ success: false, canceled: true, caseCount: cases.size }),
      importAll: async () => ({ success: false, canceled: true, restored: 0, skipped: 0, replaced: 0 }),
      deleteAll: async () => { const deleted = cases.size; cases.clear(); return { deleted }; },
    },
    documents: {
      exportPdf: async () => ({ success: false, canceled: true }),
      exportDocx: async () => ({ success: false, canceled: true }),
    },
    analysis: { analyzeDocument: unavailable, onProgress: noop },
    drafts: { generateDraft: unavailable },
    legalKnowledge: { searchRAG: async () => ({ context: '', citations: [] }) },
    legalCorpus: {
      list: async () => ({
        corpusVersion: '2026.07-phase4-official-federal-core',
        lawsCount: 16,
        provisionsCount: 7348,
        laws: [
          { code: 'CCom', name: 'Código de Comercio', module: 'mercantil', provisions: 1528, bytes: 0, sha256: '0'.repeat(64) },
          { code: 'LGSM', name: 'Ley General de Sociedades Mercantiles', module: 'mercantil', provisions: 276, bytes: 0, sha256: '0'.repeat(64) },
          { code: 'LGTOC', name: 'Ley General de Títulos y Operaciones de Crédito', module: 'mercantil', provisions: 440, bytes: 0, sha256: '0'.repeat(64) },
          { code: 'LFT', name: 'Ley Federal del Trabajo', module: 'laboral', provisions: 1266, bytes: 0, sha256: '0'.repeat(64) },
          { code: 'LCE', name: 'Ley de Comercio Exterior', module: 'comercio_exterior', provisions: 98, bytes: 0, sha256: '0'.repeat(64) },
          { code: 'RLCE', name: 'Reglamento de la Ley de Comercio Exterior', module: 'comercio_exterior', provisions: 215, bytes: 0, sha256: '0'.repeat(64) },
          { code: 'LA', name: 'Ley Aduanera', module: 'aduanal', provisions: 268, bytes: 0, sha256: '0'.repeat(64) },
          { code: 'RLA', name: 'Reglamento de la Ley Aduanera', module: 'aduanal', provisions: 281, bytes: 0, sha256: '0'.repeat(64) },
          { code: 'LIGIE', name: 'Ley de los Impuestos Generales de Importación y de Exportación', module: 'aduanal', provisions: 97, bytes: 0, sha256: '0'.repeat(64) },
          { code: 'RGCE', name: 'Reglas Generales de Comercio Exterior para 2026', module: 'aduanal', provisions: 550, bytes: 0, sha256: '0'.repeat(64) },
          { code: 'CFF', name: 'Código Fiscal de la Federación', module: 'fiscal', provisions: 421, bytes: 0, sha256: '0'.repeat(64) },
          { code: 'LISR', name: 'Ley del Impuesto sobre la Renta', module: 'fiscal', provisions: 236, bytes: 0, sha256: '0'.repeat(64) },
          { code: 'RLISR', name: 'Reglamento de la Ley del Impuesto sobre la Renta', module: 'fiscal', provisions: 313, bytes: 0, sha256: '0'.repeat(64) },
          { code: 'LIVA', name: 'Ley del Impuesto al Valor Agregado', module: 'fiscal', provisions: 79, bytes: 0, sha256: '0'.repeat(64) },
          { code: 'RLIVA', name: 'Reglamento de la Ley del Impuesto al Valor Agregado', module: 'fiscal', provisions: 84, bytes: 0, sha256: '0'.repeat(64) },
          { code: 'RMF', name: 'Resolución Miscelánea Fiscal para 2026', module: 'fiscal', provisions: 1196, bytes: 0, sha256: '0'.repeat(64) },
        ],
      }),
      download: unavailable,
      read: unavailable,
    },
    runtime: {
      getHealth: async () => ({
        status: 'degraded',
        checks: [],
        capabilities: {
          vault: ready('Portafolio local'),
          legalSearch: ready('Búsqueda en las leyes'),
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
      savePreferences: async (payload) => {
        settings = { ...settings, ...payload, automaticUpdatesEnabled: (payload.strictPrivacy ?? settings.strictPrivacy) ? false : payload.automaticUpdatesEnabled ?? settings.automaticUpdatesEnabled };
        return settings;
      },
      onUpdateAvailable: noop,
      onUpdateDownloaded: noop,
      checkForUpdates: async () => ({ ok: false, status: 'dev-mode', message: 'La búsqueda de actualizaciones sólo aplica a la app instalada.' }),
      installUpdate: () => undefined,
    },
    navigation: { onSettings: noop, onHelp: noop },
    assistant: { askInstructivo: unavailable },
    security: { reportCspViolation: async () => ({ ok: true }) },
  };

  Object.defineProperty(window, 'lexDesktop', { configurable: true, value: api });
}
