import assert from 'node:assert/strict';
import { app, BrowserWindow, ipcMain } from 'electron';
import { existsSync, mkdirSync, readFileSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { once } from 'node:events';
import { registerRecoveryHandlers } from '../../src/main/ipc/recovery.handler';
import { closeDb, createCase, saveDraft, listCases, exportCase } from '../../src/main/lib/case-vault';

const root = process.env.LEX_RECOVERY_TEST_ROOT!;
const phase = process.env.LEX_RECOVERY_TEST_PHASE!;
app.setPath('userData', join(root, 'profile'));
let win: BrowserWindow;
app.on('window-all-closed', () => {});
const evaluate = (expression: string) => win.webContents.executeJavaScript(expression);
async function ready() {
  for (let i = 0; i < 100; i++) {
    if (await evaluate('Boolean(window.recoveryTest)')) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('El renderer no inició la recuperación.');
}
async function open() {
  win = new BrowserWindow({ show: false, webPreferences: {
    preload: join(root, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true,
  } });
  await win.loadFile(join(root, 'index.html'));
  await ready();
}
async function close() {
  const closed = once(win, 'closed');
  win.close();
  await closed;
}
async function run() {
  await app.whenReady();
  let onSaveStarted = () => {};
  const saveStarted = new Promise<void>(resolve => { onSaveStarted = resolve; });
  let saveCompleted = Promise.resolve();
  ipcMain.handle('vault:create-case', (_, payload) => createCase(payload.caseId, payload.name, payload.module));
  ipcMain.handle('vault:save-draft', async (_, payload) => {
    onSaveStarted();
    saveCompleted = (async () => {
      if (phase === 'write') await new Promise(resolve => setTimeout(resolve, 250));
      await saveDraft(payload.caseId, payload.draftId, payload.draftData);
    })();
    await saveCompleted;
    return { success: true };
  });
  registerRecoveryHandlers(event => event.sender === win?.webContents && event.senderFrame === win.webContents.mainFrame);
  await open();
  const recoveryFile = join(root, 'profile', 'draft-recovery.bin');
  if (phase === 'write') {
    await evaluate('window.recoveryTest.form()');
    await close();
    await open();
    const form = await evaluate('window.recoveryTest.state()');
    assert.equal(form.instructions, 'Instrucciones que deben sobrevivir');
    assert.equal(form.fieldValues.parte, 'Empresa de prueba');
    assert.equal(form.missingReferenceFileName, 'base.pdf');
    assert.equal(form.referenceFile, null);

    await evaluate('window.recoveryTest.document()');
    const reloaded = once(win.webContents, 'did-finish-load');
    win.webContents.reload();
    await reloaded;
    await ready();
    assert.equal((await evaluate('window.recoveryTest.state()')).record.document, 'Última edición antes de cerrar');

    // Un destino temporal ocupado reproduce un fallo real de escritura.
    mkdirSync(`${recoveryFile}.tmp`);
    await evaluate('window.recoveryTest.edit("Edición protegida al fallar el disco")');
    const prevented = once(win.webContents, 'will-prevent-unload');
    win.close();
    await prevented;
    assert.equal(win.isDestroyed(), false);
    assert.equal((await evaluate('window.recoveryTest.state()')).record.document, 'Edición protegida al fallar el disco');
    // Ruta fija de un directorio vacío dentro del perfil aislado de esta prueba.
    rmdirSync(`${recoveryFile}.tmp`);
    await close();
    await open();
    await evaluate('window.recoveryTest.startSave()');
    await saveStarted;
    await evaluate('window.recoveryTest.edit("Edición durante guardado en curso")');
    await close();
    await saveCompleted;
    assert.equal(readFileSync(recoveryFile).includes(Buffer.from('Edición protegida')), false);
    console.log(JSON.stringify({ phase, formReopened: true, reload: true, closeBlockedOnWriteFailure: true, encrypted: true }));
  } else {
    const draft = await evaluate('window.recoveryTest.state()');
    assert.equal(draft.record.document, 'Edición durante guardado en curso');
    assert.equal(draft.dirty, true);
    await evaluate('window.recoveryTest.save()');
    const cases = await listCases();
    assert.equal(cases.length, 1);
    assert.equal(JSON.parse(await exportCase(cases[0].caseId)).drafts[0].document, 'Edición durante guardado en curso');
    await evaluate('window.recoveryTest.reset()');
    await close();
    assert.equal(existsSync(recoveryFile), false);
    console.log(JSON.stringify({ phase, processRestart: true, inFlightSaveRecoveredWithoutDuplicates: true, discard: true }));
  }
}
void run().then(() => { closeDb(); app.exit(0); }).catch(error => { console.error(error); closeDb(); app.exit(1); });
