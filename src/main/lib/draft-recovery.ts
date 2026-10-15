import { app, safeStorage } from 'electron';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DraftRecoverySchema, RECOVERY_MAX_CHARS, type DraftRecovery } from '../../shared/draft-recovery';
import type { CaseRetentionDays } from '../../shared/case-retention';

const recoveryPath = () => join(app.getPath('userData'), 'draft-recovery.bin');

function requireEncryption(): void {
  if (!safeStorage.isEncryptionAvailable()
    || (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')) {
    throw new Error('El cifrado del sistema no está disponible para recuperar el trabajo.');
  }
}

export function clearDraftRecovery(): void {
  rmSync(recoveryPath(), { force: true });
  rmSync(`${recoveryPath()}.tmp`, { force: true });
}

export function clearRecoveryForDocument(caseId: string, draftId?: string): void {
  const snapshot = readDraftRecovery(0);
  if (snapshot?.record?.caseId === caseId && (!draftId || snapshot.record.id === draftId)) clearDraftRecovery();
}

export function readDraftRecovery(retentionDays: CaseRetentionDays): DraftRecovery | null {
  const file = recoveryPath();
  if (!existsSync(file)) return null;
  const info = statSync(file);
  if (retentionDays && Date.now() - info.mtimeMs >= retentionDays * 86_400_000) {
    clearDraftRecovery();
    return null;
  }
  if (info.size > RECOVERY_MAX_CHARS * 4 + 4096) throw new Error('Copia de recuperación demasiado grande.');
  requireEncryption();
  const parsed = JSON.parse(safeStorage.decryptString(readFileSync(file)));
  return DraftRecoverySchema.parse(parsed) as DraftRecovery;
}

export function writeDraftRecovery(snapshot: DraftRecovery | null): void {
  if (snapshot === null) {
    clearDraftRecovery();
    return;
  }
  const json = JSON.stringify(snapshot);
  if (json.length > RECOVERY_MAX_CHARS) throw new Error('Copia de recuperación demasiado grande.');
  DraftRecoverySchema.parse(snapshot);
  requireEncryption();
  const encrypted = safeStorage.encryptString(json);
  const file = recoveryPath();
  mkdirSync(app.getPath('userData'), { recursive: true });
  // El último archivo válido se sustituye sólo después de completar la escritura.
  try {
    writeFileSync(`${file}.tmp`, encrypted, { flush: true, mode: 0o600 });
    renameSync(`${file}.tmp`, file);
  } finally {
    rmSync(`${file}.tmp`, { force: true });
  }
}
