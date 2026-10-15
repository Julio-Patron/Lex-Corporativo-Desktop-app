import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DraftRecoverySchema, RECOVERY_ERROR, type DraftRecovery, type RecoveryResult } from '../../shared/draft-recovery';
import { readDraftRecovery, writeDraftRecovery } from '../lib/draft-recovery';
import { getByokSettings } from '../lib/byok-settings';

type Event = IpcMainEvent | IpcMainInvokeEvent;
const WriteSchema = z.object({ sessionId: z.string().uuid(), revision: z.number().int().positive(), snapshot: DraftRecoverySchema.nullable() }).strict();

// La revisión impide que una escritura pendiente sustituya al vaciado de cierre.
export function registerRecoveryHandlers(isTrusted: (event: Event) => boolean): void {
  let sessionId = '';
  let revision = 0;
  ipcMain.handle('recovery:load', (event) => {
    if (!isTrusted(event)) throw new Error('Origen no autorizado.');
    sessionId = randomUUID();
    revision = 0;
    try {
      return { sessionId, snapshot: readDraftRecovery(getByokSettings().caseRetentionDays) };
    } catch {
      return { sessionId, snapshot: null, error: 'No se pudo leer la copia de recuperación. Se conserva en este equipo; no la sustituyas si necesitas recuperarla.' };
    }
  });
  const save = (event: Event, raw: unknown): RecoveryResult => {
    try {
      if (!isTrusted(event)) throw new Error('Origen no autorizado.');
      const request = WriteSchema.parse(raw);
      if (request.sessionId !== sessionId) throw new Error('Sesión obsoleta.');
      if (request.revision <= revision) return { ok: true };
      writeDraftRecovery(request.snapshot as DraftRecovery | null);
      revision = request.revision;
      return { ok: true };
    } catch {
      return { ok: false, message: RECOVERY_ERROR };
    }
  };
  ipcMain.handle('recovery:save', save);
  // Único IPC síncrono: beforeunload no espera promesas antes de destruir la página.
  ipcMain.on('recovery:flush', (event, request) => { event.returnValue = save(event, request); });
}
