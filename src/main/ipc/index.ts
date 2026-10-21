import { app, dialog } from 'electron';
import { ipcMain } from './trusted-ipc';
import { z } from 'zod';
import { copyFileSync } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';
import { registerAnalyzeHandlers } from './analyze.handler';
import { registerDraftHandlers } from './draft.handler';
import { registerRagHandlers } from './rag.handler';
import { registerVaultHandlers } from './vault.handler';
import { registerAssistantHandlers } from './assistant.handler';
import { registerByokHandlers } from './byok.handler';
import { registerCorpusHandlers } from './corpus.handler';
import { getLegalKnowledgeRuntimePath, isLocalRagAvailable } from '../lib/rag';
import { isLegalCorpusAvailable } from '../lib/legal-corpus';
import { applyRetentionPolicy, getVaultProtectionStatus, listCases, purgeExpiredCases } from '../lib/case-vault';
import { getByokSettings, updateAppPreferences } from '../lib/byok-settings';
import { CASE_RETENTION_OPTIONS, type CaseRetentionDays } from '../../shared/case-retention';
import { getTraceLedgerStatus, logLegalExecution } from '../lib/traceability';
import { sanitizeForLogs } from '../lib/sanitizer';
import * as crypto from 'crypto';

const AppPreferencesSchema = z.object({
  strictPrivacy: z.boolean().optional(),
  automaticUpdatesEnabled: z.boolean().optional(),
  caseRetentionDays: z.number().refine(
    (days): days is CaseRetentionDays => CASE_RETENTION_OPTIONS.includes(days as CaseRetentionDays),
    'Periodo de conservación no admitido.',
  ).optional(),
}).strict();

export function registerIpcHandlers(): void {
  // ── App Metadata ───────────────────────────
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('runtime:get-health', async () => {
    let vaultReady = false;
    let vaultDetail = 'No se pudo abrir la bóveda local.';
    let ragReady = false;
    let legalCorpusReady = false;

    try {
      await listCases();
      const protection = getVaultProtectionStatus();
      vaultReady = protection.ready;
      vaultDetail = protection.ready
        ? `Cifrado del sistema: ${protection.backend}`
        : protection.legacyPayloads > 0
          ? `${protection.legacyPayloads} registros heredados requieren migración cifrada.`
          : `Cifrado seguro no disponible (${protection.backend}).`;
    } catch {
      vaultReady = false;
    }

    try {
      ragReady = await isLocalRagAvailable();
    } catch {
      ragReady = false;
    }

    legalCorpusReady = isLegalCorpusAvailable();

    const byokSettings = getByokSettings();
    const embeddingModelPath = app.isPackaged
      ? join(process.resourcesPath, 'legal-runtime', 'models', 'Xenova', 'all-MiniLM-L6-v2', 'onnx', 'model_quantized.onnx')
      : join(app.getAppPath(), 'legal-runtime', 'models', 'Xenova', 'all-MiniLM-L6-v2', 'onnx', 'model_quantized.onnx');
    const embeddingsReady = existsSync(embeddingModelPath);
    const byokGenerationReady = byokSettings.enabled && byokSettings.hasApiKey;
    const legalSearchReady = ragReady && embeddingsReady;
    const legalGenerationReady = vaultReady && legalSearchReady && byokGenerationReady;
    const checks = [
      { id: 'vault', label: 'Bóveda SQLite cifrada', ok: vaultReady, detail: vaultDetail },
      { id: 'rag', label: 'Base legal LanceDB', ok: ragReady, detail: getLegalKnowledgeRuntimePath() },
      { id: 'corpus', label: 'Corpus normativo íntegro', ok: legalCorpusReady, detail: legalCorpusReady ? 'Las 16 leyes y reglamentos están disponibles.' : 'Faltan archivos de las leyes instaladas.' },
      { id: 'embeddings', label: 'Modelo local de búsqueda', ok: embeddingsReady, detail: embeddingModelPath },
      { id: 'byok', label: 'Cuenta de IA del usuario', ok: byokGenerationReady, detail: byokGenerationReady ? `${byokSettings.provider}:${byokSettings.model}` : 'Agrega y activa una clave de IA' },
      { id: 'privacy', label: 'Privacidad estricta', ok: byokSettings.strictPrivacy || !byokSettings.automaticUpdatesEnabled },
    ];

    const blocking = checks.filter((check) => !check.ok && (check.id === 'vault' || check.id === 'privacy' || check.id === 'byok'));
    const status = checks.every((check) => check.ok)
      ? 'ready'
      : blocking.length > 0
        ? 'blocked'
        : 'degraded';

    return {
      status,
      checks,
      capabilities: {
        vault: {
          ready: vaultReady,
          label: 'Portafolio local',
          detail: vaultReady ? 'Tu portafolio está disponible y protegido con tu usuario de Windows.' : vaultDetail,
        },
        legalSearch: {
          ready: legalSearchReady,
          label: 'Búsqueda en las leyes',
          detail: legalSearchReady
            ? 'La búsqueda en las leyes funciona en tu computadora.'
            : 'Faltan archivos necesarios para buscar en las leyes.',
        },
        legalCorpus: {
          ready: legalCorpusReady,
          label: 'Leyes instaladas',
          detail: legalCorpusReady
            ? 'El texto completo de cada ley está disponible.'
            : 'Faltan textos de algunas leyes.',
        },
        legalGeneration: {
          ready: legalGenerationReady,
          label: 'Análisis y generación jurídica',
          detail: legalGenerationReady
            ? `Disponible mediante ${byokSettings.provider} con tu cuenta de IA.`
            : 'Requiere el portafolio, las leyes instaladas y una clave de IA activa.',
        },
        documentReview: {
          ready: vaultReady && legalSearchReady,
          label: 'Revisión de documentos',
          detail: !(vaultReady && legalSearchReady)
            ? 'Requiere el portafolio y la búsqueda en las leyes.'
            : byokGenerationReady
              ? `Revisión con IA mediante ${byokSettings.provider}.`
              : 'Revisión básica, sin IA. Conecta tu cuenta de IA para la revisión completa.',
        },
        rulesAssessment: {
          ready: vaultReady,
          label: 'Revisiones básicas',
          detail: vaultReady
            ? 'Las revisiones básicas pueden guardarse en el portafolio.'
            : 'Requiere el portafolio para guardar el resultado.',
        },
        localAssistant: {
          ready: byokGenerationReady,
          label: 'Ayuda conversacional',
          detail: byokGenerationReady
            ? `Disponible mediante ${byokSettings.provider}.`
            : 'Requiere una clave de IA activa.',
        },
      },
    };
  });

  ipcMain.handle('trace:get-status', async () => getTraceLedgerStatus());
  ipcMain.handle('trace:export', async () => {
    const status = getTraceLedgerStatus();
    if (!status.exists) {
      return { success: false, reason: 'empty' as const, sourcePath: status.path };
    }

    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: `lex-corporativo-trazabilidad-${new Date().toISOString().slice(0, 10)}.jsonl`,
      filters: [{ name: 'Bitácora JSONL', extensions: ['jsonl'] }],
    });

    if (canceled || !filePath) {
      return { success: false, reason: 'canceled' as const, sourcePath: status.path };
    }

    copyFileSync(status.path, filePath);
    return { success: true, filePath, sourcePath: status.path };
  });

  // ── App Preferences ──────────────────────────
  // Privacidad, actualizaciones y conservación del portafolio no dependen de la API key.
  ipcMain.handle('settings:save-preferences', async (_event, rawPayload: unknown) => {
    const input = AppPreferencesSchema.parse(rawPayload);
    const settings = updateAppPreferences(input);
    if (input.caseRetentionDays !== undefined) {
      await applyRetentionPolicy(settings.caseRetentionDays);
      await purgeExpiredCases();
    }
    return settings;
  });

  // ── CSP Violation Reporting ─────────────────
  ipcMain.handle('csp:report', async (_event, report: unknown) => {
    try {
      const cleanReport = sanitizeForLogs(report);
      console.warn('[CSP Violation]', JSON.stringify(cleanReport));
      logLegalExecution({
        requestId: crypto.randomUUID(),
        operation: 'consultation',
        module: 'todos',
        primaryModel: 'csp_shield',
        finalModelUsed: 'none',
        hasFallback: false,
        fallbackReason: 'csp_directive_violation',
        prompt: 'CSP Violation Report',
        ragContext: '',
        output: JSON.stringify(cleanReport).slice(0, 1000),
        sources: [],
      });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

  // ── Modular Handler Registration ───────────
  registerAnalyzeHandlers();
  registerDraftHandlers();
  registerRagHandlers();
  registerVaultHandlers();
  registerAssistantHandlers();
  registerByokHandlers();
  registerCorpusHandlers();
}
