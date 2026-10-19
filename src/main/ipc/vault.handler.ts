import { app, dialog } from 'electron';
import { ipcMain } from './trusted-ipc';
import { formatForLog } from '../lib/sanitizer';
import { readFileSync, writeFileSync } from 'fs';
import { basename, resolve } from 'path';
import { z } from 'zod';
import {
  createCase,
  deleteAnalysis,
  deleteAllCases,
  deleteCase,
  deleteDraft,
  exportCase,
  listCases,
  restoreVaultBackup,
  saveAnalysis,
  saveDraft,
  VaultRestoreConflict,
} from '../lib/case-vault';
import { hashPortableBackupCore, openPortableBackup, sealPortableBackup } from '../lib/portable-backup';
import { getByokSettings } from '../lib/byok-settings';
import { computeCaseRetentionUntil } from '../../shared/case-retention';
import { clearDraftRecovery, clearRecoveryForDocument } from '../lib/draft-recovery';

const caseIdRegex = /^[a-zA-Z0-9-_]+$/;

// Zero-Trust input validation schemas for Vault operations
export const CreateCaseSchema = z.object({
  caseId: z.string().min(1).regex(caseIdRegex, "Invalid case ID format"),
  name: z.string().min(1),
  module: z.enum(['engineering', 'fiscal', 'mercantil']),
});

export const SaveAnalysisSchema = z.object({
  caseId: z.string().min(1).regex(caseIdRegex, "Invalid case ID format"),
  analysisId: z.string().min(1),
  analysisData: z.record(z.string(), z.unknown()),
  expectedModule: z.enum(['engineering', 'fiscal', 'mercantil']).optional(),
});

export const SaveDraftSchema = z.object({
  caseId: z.string().min(1).regex(caseIdRegex, "Invalid case ID format"),
  draftId: z.string().min(1),
  draftData: z.record(z.string(), z.unknown()),
  expectedModule: z.enum(['engineering', 'fiscal', 'mercantil']).optional(),
});

export const DeleteAnalysisSchema = z.object({
  caseId: z.string().min(1).regex(caseIdRegex, "Invalid case ID format"),
  analysisId: z.string().min(1),
  expectedModule: z.enum(['engineering', 'fiscal', 'mercantil']).optional(),
});

export const DeleteDraftSchema = z.object({
  caseId: z.string().min(1).regex(caseIdRegex, "Invalid case ID format"),
  draftId: z.string().min(1),
  expectedModule: z.enum(['engineering', 'fiscal', 'mercantil']).optional(),
});

export const CaseOperationSchema = z.union([
  z.string().min(1).regex(caseIdRegex, "Invalid case ID format"),
  z.object({
    caseId: z.string().min(1).regex(caseIdRegex, "Invalid case ID format"),
    expectedModule: z.enum(['engineering', 'fiscal', 'mercantil']).optional(),
  }),
]);

export const ExportPdfSchema = z.object({
  base64: z.string().min(1).max(30_000_000),
  defaultPath: z.string().min(1).max(260),
});

export const ExportDocxSchema = z.object({
  base64: z.string().min(1).max(30_000_000),
  defaultPath: z.string().min(1).max(260),
});


const DeleteAllSchema = z.object({
  confirmation: z.literal('DELETE_ALL_LOCAL_DATA'),
}).strict();

export const ExportBackupSchema = z.object({
  password: z.string().min(8).max(1024),
}).strict();

export const ImportBackupSchema = z.object({
  password: z.string().min(8).max(1024),
  onConflict: z.enum(['abort', 'replace']).optional(),
  filePath: z.string().min(1).max(1024).optional(),
}).strict();

function parseCaseOperation(raw: unknown): { caseId: string; expectedModule?: 'engineering' | 'fiscal' | 'mercantil' } {
  const parsed = CaseOperationSchema.parse(raw);
  return typeof parsed === 'string' ? { caseId: parsed } : parsed;
}

export function registerVaultHandlers(): void {
  // ── Create Case ──────────────────────────
  ipcMain.handle('vault:create-case', async (_event, rawPayload: unknown) => {
    try {
      const payload = CreateCaseSchema.parse(rawPayload);
      // La conservación la decide la preferencia local, no el renderer: cada
      // actividad renueva el plazo cuando la política tiene caducidad.
      const retentionUntil = computeCaseRetentionUntil(new Date(), getByokSettings().caseRetentionDays) ?? undefined;
      return await createCase(payload.caseId, payload.name, payload.module, retentionUntil);
    } catch (err: any) {
      console.error('[IPC Vault] create-case validation or storage error:', formatForLog(err));
      throw new Error(`Error en el portafolio al crear actividad: ${err.message}`);
    }
  });

  // ── List Cases ───────────────────────────
  ipcMain.handle('vault:list-cases', async () => {
    try {
      return await listCases();
    } catch (err: any) {
      console.error('[IPC Vault] list-cases storage error:', formatForLog(err));
      throw new Error(`Error en el portafolio al listar actividades: ${err.message}`);
    }
  });

  // ── Save Analysis ────────────────────────
  ipcMain.handle('vault:save-analysis', async (_event, rawPayload: unknown) => {
    try {
      const payload = SaveAnalysisSchema.parse(rawPayload);
      await saveAnalysis(payload.caseId, payload.analysisId, payload.analysisData, payload.expectedModule);
      return { success: true };
    } catch (err: any) {
      console.error('[IPC Vault] save-analysis validation or storage error.');
      throw new Error(`Error en el portafolio al guardar análisis: ${err.message}`);
    }
  });

  // ── Save Draft ──────────────────────────
  ipcMain.handle('vault:save-draft', async (_event, rawPayload: unknown) => {
    try {
      const payload = SaveDraftSchema.parse(rawPayload);
      await saveDraft(payload.caseId, payload.draftId, payload.draftData, payload.expectedModule);
      return { success: true };
    } catch (err: any) {
      console.error('[IPC Vault] save-draft validation or storage error.');
      throw new Error(`Error en el portafolio al guardar borrador: ${err.message}`);
    }
  });

  ipcMain.handle('vault:delete-analysis', async (_event, rawPayload: unknown) => {
    try {
      const payload = DeleteAnalysisSchema.parse(rawPayload);
      const deleted = await deleteAnalysis(payload.caseId, payload.analysisId, payload.expectedModule);
      return { success: true, deleted };
    } catch (err: any) {
      console.error('[IPC Vault] delete-analysis validation or storage error.');
      throw new Error(`Error en el portafolio al eliminar analisis: ${err.message}`);
    }
  });

  ipcMain.handle('vault:delete-draft', async (_event, rawPayload: unknown) => {
    try {
      const payload = DeleteDraftSchema.parse(rawPayload);
      clearRecoveryForDocument(payload.caseId, payload.draftId);
      const deleted = await deleteDraft(payload.caseId, payload.draftId, payload.expectedModule);
      return { success: true, deleted };
    } catch (err: any) {
      console.error('[IPC Vault] delete-draft validation or storage error.');
      throw new Error(`Error en el portafolio al eliminar documento: ${err.message}`);
    }
  });

  // ── Delete Case ──────────────────────────
  ipcMain.handle('vault:delete-case', async (_event, rawPayload: unknown) => {
    try {
      const payload = parseCaseOperation(rawPayload);
      clearRecoveryForDocument(payload.caseId);
      await deleteCase(payload.caseId, payload.expectedModule);
      return { success: true };
    } catch (err: any) {
      console.error('[IPC Vault] delete-case storage error.');
      throw new Error(`Error en el portafolio al eliminar actividad: ${err.message}`);
    }
  });

  ipcMain.handle('vault:delete-all', async (_event, rawPayload: unknown) => {
    DeleteAllSchema.parse(rawPayload);
    clearDraftRecovery();
    return { deleted: await deleteAllCases() };
  });

  ipcMain.handle('vault:export-all', async (_event, rawPayload: unknown) => {
    const parsed = ExportBackupSchema.safeParse(rawPayload);
    if (!parsed.success) throw new Error('La contraseña del respaldo debe tener al menos 8 caracteres.');
    const metadata = await listCases();
    const cases: unknown[] = [];
    const batchSize = 10;
    for (let i = 0; i < metadata.length; i += batchSize) {
      const batch = metadata.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async item => JSON.parse(await exportCase(item.caseId)))
      );
      cases.push(...batchResults);
    }
    const exportCore = {
      format: 'lex-corporativo-vault-backup' as const,
      formatVersion: 1 as const,
      exportedAt: new Date().toISOString(),
      caseCount: cases.length,
      cases,
    };
    const defaultBackupPath = resolve(
      app.getPath('downloads'),
      `lex-corporativo-respaldo-${new Date().toISOString().slice(0, 10)}.json`
    );
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultBackupPath,
      filters: [{ name: 'Respaldo cifrado Lex Corporativo', extensions: ['json'] }],
    });
    if (canceled || !filePath) {
      return { success: false, canceled: true, caseCount: cases.length };
    }
    writeFileSync(filePath, `${sealPortableBackup(exportCore, parsed.data.password)}\n`, 'utf8');
    return { success: true, filePath, caseCount: cases.length, packageHash: hashPortableBackupCore(exportCore) };
  });

  ipcMain.handle('vault:import-all', async (_event, rawPayload: unknown) => {
    const parsed = ImportBackupSchema.safeParse(rawPayload);
    if (!parsed.success) throw new Error('La contraseña del respaldo debe tener al menos 8 caracteres.');
    let selectedFilePath = parsed.data.filePath;
    if (!selectedFilePath) {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        filters: [{ name: 'Respaldo cifrado Lex Corporativo', extensions: ['json'] }],
        properties: ['openFile'],
      });
      if (canceled || !filePaths?.[0]) {
        return { success: false, canceled: true, restored: 0, skipped: 0, replaced: 0 };
      }
      selectedFilePath = filePaths[0];
    }
    try {
      const opened = openPortableBackup(readFileSync(selectedFilePath, 'utf8'), parsed.data.password);
      const result = await restoreVaultBackup(opened, parsed.data.onConflict ?? 'abort');
      return { success: true, ...result };
    } catch (error) {
      if (error instanceof VaultRestoreConflict) {
        return {
          success: false,
          conflict: true,
          conflictCount: error.conflictCount,
          filePath: selectedFilePath,
          restored: 0,
          skipped: 0,
          replaced: 0,
        };
      }
      throw new Error(error instanceof Error ? error.message : 'No se pudo restaurar el respaldo.');
    }
  });

  // ── Load Case Data ───────────────────────
  ipcMain.handle('vault:load-case-data', async (_event, rawPayload: unknown) => {
    try {
      const payload = parseCaseOperation(rawPayload);
      // To keep it simple, we just call exportCase and let renderer handle it.
      const exported = await exportCase(payload.caseId, payload.expectedModule);
      return JSON.parse(exported);
    } catch (err: any) {
      console.error('[IPC Vault] load-case-data storage error.');
      throw new Error(`Error en el portafolio al cargar actividad: ${err.message}`);
    }
  });

  // ── Export PDF ───────────────────────────
  ipcMain.handle('vault:export-pdf', async (_event, rawPayload: unknown) => {
    try {
      const payload = ExportPdfSchema.parse(rawPayload);
      const safeFileName = basename(payload.defaultPath);
      const safeDefaultPath = resolve(app.getPath('downloads'), safeFileName);

      const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: safeDefaultPath,
        filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }]
      });

      if (!canceled && filePath) {
        // Strip any data URI prefix (e.g. data:application/pdf;filename=...;base64,)
        const parts = payload.base64.split('base64,');
        const base64Data = parts.length > 1 ? parts[1] : payload.base64;
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length < 5 || buffer.toString('utf8', 0, 5) !== '%PDF-') {
          throw new Error('El contenido proporcionado no es un archivo PDF válido.');
        }
        writeFileSync(filePath, buffer);
        return { success: true, filePath };
      }
      return { success: false, canceled: true };
    } catch (err: any) {
      console.error('[IPC Vault] export-pdf error:', formatForLog(err));
      throw new Error(`Error al exportar PDF: ${err.message}`);
    }
  });

  // ── Export DOCX (Word) ────────────────────
  ipcMain.handle('vault:export-docx', async (_event, rawPayload: unknown) => {
    try {
      const payload = ExportDocxSchema.parse(rawPayload);
      const safeFileName = basename(payload.defaultPath);
      const safeDefaultPath = resolve(app.getPath('downloads'), safeFileName);

      const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: safeDefaultPath,
        filters: [{ name: 'Documento de Microsoft Word (.docx)', extensions: ['docx'] }]
      });

      if (!canceled && filePath) {
        const parts = payload.base64.split('base64,');
        const base64Data = parts.length > 1 ? parts[1] : payload.base64;
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
          throw new Error('El contenido proporcionado no es un documento Word (.docx) válido.');
        }
        writeFileSync(filePath, buffer);
        return { success: true, filePath };
      }
      return { success: false, canceled: true };
    } catch (err: any) {
      console.error('[IPC Vault] export-docx error:', formatForLog(err));
      throw new Error(`Error al exportar Word: ${err.message}`);
    }
  });
}

