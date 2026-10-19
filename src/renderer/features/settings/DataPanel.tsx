import { useEffect, useId, useState } from 'react';
import { CheckCircle2, RefreshCw, TriangleAlert } from 'lucide-react';
import type { CaseRetentionDays } from '../../../preload/types';
import { CASE_RETENTION_LABELS, CASE_RETENTION_OPTIONS } from '../../../shared/case-retention';
import { Button, Card, ConfirmDialog, Field, SectionTitle, TextInput, Toggle } from '../../components/ui';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { formatFileSize } from '../../lib/files';
import { cn } from '../../lib/utils';
import { useUiStore } from '../../store/useUiStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

export function DataPanel() {
  const settings = useUiStore((state) => state.settings);
  const setSettings = useUiStore((state) => state.setSettings);
  const health = useUiStore((state) => state.runtimeHealth);
  const healthLoading = useUiStore((state) => state.runtimeHealthLoading);
  const refreshRuntimeHealth = useUiStore((state) => state.refreshRuntimeHealth);
  const notify = useUiStore((state) => state.notify);
  const [dialogState, confirm] = useConfirmDialog();
  const confirmId = useId();
  const [ledger, setLedger] = useState<{ path: string; exists: boolean; size: number } | null>(null);
  const [busy, setBusy] = useState<'retention' | 'privacy' | 'backup' | 'restore' | 'ledger' | 'delete' | null>(null);
  const [deleteText, setDeleteText] = useState('');
  const [backupPassword, setBackupPassword] = useState('');
  const [backupConfirm, setBackupConfirm] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const backupPasswordId = useId();
  const backupConfirmId = useId();
  const restorePasswordId = useId();

  useEffect(() => {
    window.lexDesktop.traceability.getStatus().then(setLedger).catch(() => setLedger(null));
  }, []);

  const savePreferences = async (patch: { caseRetentionDays?: CaseRetentionDays; strictPrivacy?: boolean }, kind: 'retention' | 'privacy') => {
    setBusy(kind);
    try {
      setSettings(await window.lexDesktop.settings.savePreferences(patch));
      notify('Preferencia guardada.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo guardar la preferencia.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const changeRetention = async (days: CaseRetentionDays) => {
    if (days !== 0) {
      const accepted = await confirm({
        title: 'Activar eliminación automática',
        message: `Los elementos del portafolio sin actividad durante ${days} días se eliminarán de forma permanente, incluidos los que ya superen ese plazo.`,
        confirmLabel: 'Activar',
        variant: 'danger',
      });
      if (!accepted) return;
    }
    await savePreferences({ caseRetentionDays: days }, 'retention');
  };

  const backup = async () => {
    if (backupPassword.length < 8) {
      notify('La contraseña del respaldo debe tener al menos 8 caracteres.', 'error');
      return;
    }
    if (backupPassword !== backupConfirm) {
      notify('La confirmación no coincide con la contraseña.', 'error');
      return;
    }
    setBusy('backup');
    try {
      const result = await window.lexDesktop.cases.exportAll({ password: backupPassword });
      if (result.success) {
        notify(`Respaldo cifrado de ${result.caseCount} elementos guardado en ${result.filePath}.`, 'success');
        if (result.omittedCount) {
          notify(`${result.omittedCount} asunto(s) no se incluyeron porque no se pueden descifrar en este equipo. Elimínalos del portafolio o restáuralos desde el equipo donde se crearon.`, 'error');
        }
        setBackupPassword('');
        setBackupConfirm('');
      }
    } catch (error: any) {
      notify(error?.message || 'No se pudo crear el respaldo.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const restore = async (onConflict: 'abort' | 'replace' = 'abort', filePath?: string) => {
    if (restorePassword.length < 8) {
      notify('Escribe la contraseña con la que se creó el respaldo.', 'error');
      return;
    }
    setBusy('restore');
    try {
      const result = await window.lexDesktop.cases.importAll({
        password: restorePassword,
        onConflict,
        ...(filePath ? { filePath } : {}),
      });
      if (result.canceled) return;
      if (result.conflict) {
        setBusy(null);
        const accepted = await confirm({
          title: 'El portafolio ya tiene esos asuntos',
          message: `${result.conflictCount} asuntos del respaldo ya existen con otro contenido. Reemplazarlos sustituye sus documentos, análisis, borradores y estado. Si cancelas, el portafolio queda igual.`,
          confirmLabel: 'Reemplazar',
          variant: 'danger',
        });
        if (accepted) await restore('replace', result.filePath);
        return;
      }
      if (result.success) {
        notify(`Restauración terminada: ${result.restored} asuntos nuevos, ${result.skipped} sin cambios y ${result.replaced} reemplazados.`, 'success');
        setRestorePassword('');
      }
    } catch (error: any) {
      notify(error?.message || 'No se pudo restaurar el respaldo.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const exportLedger = async () => {
    setBusy('ledger');
    try {
      const result = await window.lexDesktop.traceability.exportLedger();
      if (result.success) notify(`Bitácora guardada en ${result.filePath}.`, 'success');
      else if (result.reason === 'empty') notify('La bitácora todavía está vacía.', 'info');
      setLedger(await window.lexDesktop.traceability.getStatus());
    } catch (error: any) {
      notify(error?.message || 'No se pudo exportar la bitácora.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const deleteAll = async () => {
    const accepted = await confirm({
      title: 'Eliminar todos los datos',
      message: 'Se eliminarán todos los documentos y revisiones del portafolio. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar todo',
      variant: 'danger',
    });
    if (!accepted) return;
    setBusy('delete');
    try {
      await window.lexDesktop.cases.deleteAll({ confirmation: 'DELETE_ALL_LOCAL_DATA' });
      useWorkspaceStore.getState().resetDraft();
      useWorkspaceStore.getState().resetReview();
      setDeleteText('');
      notify('Se eliminaron los datos del portafolio.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudieron eliminar los datos.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const checks = health ? [
    { label: 'Portafolio cifrado (SQLite)', ok: health.capabilities.vault.ready, detail: health.capabilities.vault.detail },
    { label: 'Leyes instaladas', ok: health.capabilities.legalCorpus.ready, detail: health.capabilities.legalCorpus.detail },
    { label: 'Índice de búsqueda (LanceDB y modelo local)', ok: health.capabilities.legalSearch.ready, detail: health.capabilities.legalSearch.detail },
  ] : [];

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle
          title="Conservación del portafolio"
          description="Decide cuánto tiempo se guardan tus documentos y revisiones en este equipo."
        />
        <div role="radiogroup" aria-label="Conservación del portafolio" className="space-y-2">
          {CASE_RETENTION_OPTIONS.map((days) => {
            const selected = (settings?.caseRetentionDays ?? 0) === days;
            return (
              <label key={days} className={cn('flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm', selected ? 'border-legal-950 bg-slate-50' : 'border-slate-200 hover:border-slate-300')}>
                <input
                  type="radio"
                  name="retention"
                  checked={selected}
                  disabled={busy === 'retention'}
                  onChange={() => void changeRetention(days)}
                  className="h-4 w-4 accent-legal-950"
                />
                <span className="font-semibold text-slate-900">{CASE_RETENTION_LABELS[days]}</span>
              </label>
            );
          })}
        </div>
      </Card>

      <Card>
        <Toggle
          label="Privacidad estricta"
          description="Impide cualquier conexión en segundo plano, incluida la búsqueda automática de actualizaciones. La IA sólo se contacta cuando la usas."
          checked={settings?.strictPrivacy ?? true}
          disabled={!settings || busy === 'privacy'}
          onChange={(strictPrivacy) => void savePreferences({ strictPrivacy }, 'privacy')}
        />
      </Card>

      <Card>
        <SectionTitle
          title="Componentes locales"
          actions={(
            <Button size="sm" variant="ghost" onClick={() => void refreshRuntimeHealth()} isLoading={healthLoading}>
              {!healthLoading && <RefreshCw size={14} aria-hidden="true" />} Comprobar
            </Button>
          )}
        />
        <ul className="space-y-3 text-sm">
          {checks.map((check) => (
            <li key={check.label} className="flex items-start gap-2.5">
              {check.ok
                ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                : <TriangleAlert size={17} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />}
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{check.label}</p>
                <p className="break-words text-slate-600">{check.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <SectionTitle
            title="Respaldo"
            description="El archivo se cifra con la contraseña que elijas. En otro equipo se abre con esa contraseña, no con el cifrado de Windows de este perfil. Incluye asuntos, documentos, análisis, borradores y su estado. No incluye la clave de IA ni la redacción pendiente."
          />
          <div className="space-y-3">
            <Field label="Contraseña del respaldo" htmlFor={backupPasswordId}>
              <TextInput id={backupPasswordId} type="password" autoComplete="new-password" value={backupPassword} onChange={(event) => setBackupPassword(event.target.value)} />
            </Field>
            <Field label="Confirmar contraseña" htmlFor={backupConfirmId}>
              <TextInput id={backupConfirmId} type="password" autoComplete="new-password" value={backupConfirm} onChange={(event) => setBackupConfirm(event.target.value)} />
            </Field>
            <Button variant="secondary" onClick={() => void backup()} isLoading={busy === 'backup'} disabled={busy === 'restore'}>Crear respaldo</Button>
            <Field label="Contraseña para restaurar" htmlFor={restorePasswordId} hint="Si el asunto ya existe con el mismo contenido, no se duplica. Si el contenido es distinto, se pide confirmación antes de reemplazarlo.">
              <TextInput id={restorePasswordId} type="password" autoComplete="current-password" value={restorePassword} onChange={(event) => setRestorePassword(event.target.value)} />
            </Field>
            <Button variant="secondary" onClick={() => void restore()} isLoading={busy === 'restore'} disabled={busy === 'backup'}>Restaurar respaldo</Button>
          </div>
        </Card>
        <Card>
          <SectionTitle
            title="Bitácora de trazabilidad"
            description={ledger?.exists ? `Registro de cada operación con hashes de verificación (${formatFileSize(ledger.size)}).` : 'Registro de cada operación con hashes de verificación. Aún no hay registros.'}
          />
          <Button variant="secondary" onClick={() => void exportLedger()} isLoading={busy === 'ledger'} disabled={!ledger?.exists}>Exportar bitácora</Button>
        </Card>
      </div>

      <Card className="border-red-200">
        <SectionTitle title="Eliminar todos los datos" description="Borra permanentemente el portafolio de este equipo. La configuración de IA se conserva." />
        <Field label='Escribe "ELIMINAR" para confirmar' htmlFor={confirmId}>
          <div className="flex flex-wrap gap-2">
            <TextInput id={confirmId} value={deleteText} onChange={(event) => setDeleteText(event.target.value)} className="max-w-xs" />
            <Button variant="danger" onClick={() => void deleteAll()} disabled={deleteText !== 'ELIMINAR'} isLoading={busy === 'delete'}>Eliminar todo</Button>
          </div>
        </Field>
      </Card>

      <ConfirmDialog {...dialogState} />
    </div>
  );
}
