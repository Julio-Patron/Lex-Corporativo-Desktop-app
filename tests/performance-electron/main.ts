import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { isTrustedAppSender, setIpcSenderGuard } from '../../src/main/ipc/trusted-ipc';

const root = process.cwd();
const profile = process.env.LEX_PERF_PROFILE!;
app.setPath('userData', profile);
app.setPath('sessionData', profile);
(app as typeof app & { setAppPath(value: string): void }).setAppPath(root);
const samples: Record<string, number[]> = {};
const errors: string[] = [];
async function measured<T>(name: string, operation: () => Promise<T> | T): Promise<T> {
  const start = performance.now();
  const result = await operation();
  (samples[name] ||= []).push(performance.now() - start);
  return result;
}
const synthetic = '# Contrato sintético\n\n' + 'El proveedor prestará servicios. El pago requiere CFDI y evidencia de materialidad. Las partes acuerdan obligaciones y plazos.\n\n'.repeat(30);
async function main() {
  await app.whenReady();
  const { registerIpcHandlers } = await import('../../src/main/ipc');
  const { registerRecoveryHandlers } = await import('../../src/main/ipc/recovery.handler');
  const { searchLegalArticles } = await import('../../src/main/lib/rag');
  const { getLegalCorpusOverview } = await import('../../src/main/lib/legal-corpus');
  const { processAnalyzePayload } = await import('../../src/main/ipc/analyze.handler');
  const { closeDb } = await import('../../src/main/lib/case-vault');
  registerIpcHandlers();
  ipcMain.handle('update:check-now', () => ({ ok: false, status: 'dev-mode' }));
  const win = new BrowserWindow({ width: 1400, height: 900, show: false,
    webPreferences: { offscreen: true, preload: path.join(root, 'out/preload/index.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  const documentUrl = pathToFileURL(path.join(root, 'out/renderer/index.html')).href;
  setIpcSenderGuard(event => isTrustedAppSender(event, {
    webContents: win.webContents,
    mainFrame: win.webContents.mainFrame,
    documentUrl,
  }));
  registerRecoveryHandlers(event => event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame && event.senderFrame.url.split('#')[0] === documentUrl);
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 2 && /Content Security Policy|frame-ancestors|report-uri/i.test(message)) errors.push(message); });
  // Sólo este proceso sintético sustituye el diálogo; nunca accede a Descargas.
  dialog.showSaveDialog = (async (options: Electron.SaveDialogOptions) => ({ canceled: false, filePath: path.join(profile, path.basename(options.defaultPath || 'export')) })) as typeof dialog.showSaveDialog;
  const ready = async () => {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (await win.webContents.executeJavaScript("document.querySelector('h1')?.textContent === 'Buscador normativo'")) {
        await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('La pantalla inicial no estuvo lista');
  };
  await win.loadFile(path.join(root, 'out/renderer/index.html'));
  await ready();
  samples.processToHomeMs = [Date.now() - Number(process.env.LEX_PERF_STARTED)];
  const memory = () => ({ mainRssBytes: process.memoryUsage().rss, appWorkingSetKiB: app.getAppMetrics().reduce((sum, item) => sum + item.memory.workingSetSize, 0) });
  const memoryBefore = memory();
  await measured('reloadHomeMs', async () => { await win.loadFile(path.join(root, 'out/renderer/index.html')); await ready(); });
  await win.webContents.executeJavaScript(fs.readFileSync(process.env.LEX_PERF_EXPORTS!, 'utf8'));
  const first = await measured('firstSearchMs', () => searchLegalArticles('CFF artículo 69-B', 'fiscal', 8));
  assert.ok(first.matches.length > 0);
  for (let index = 0; index < 5; index++) {
    await measured('warmSearchMs', () => searchLegalArticles('CFF artículo 69-B', 'fiscal', 8));
    const overview = await measured('lawListMs', () => getLegalCorpusOverview());
    assert.equal(overview.laws.length, 16);
    const review = await measured('basicReviewMs', () => processAnalyzePayload({ ecosystem: 'fiscal', files: [{ name: 'sintetico.txt', mimeType: 'text/plain', base64: Buffer.from(synthetic).toString('base64') }] }, null));
    assert.equal(review.reviewMode, 'basic');
    assert.equal(review.basicReason, 'no_api_key');
    const pdf = await measured('pdfExportMs', () => win.webContents.executeJavaScript(`LexPerfExports.generateDocumentPDF(${JSON.stringify(synthetic)}, 'Ensayo sintético', 'Auditoría de rendimiento', 'ensayo')`));
    assert.equal(pdf.success, true);
    const docx = await measured('docxExportMs', () => win.webContents.executeJavaScript(`LexPerfExports.generateDocumentDocx(${JSON.stringify(synthetic)}, {title:'Ensayo sintético', filenamePrefix:'ensayo'})`));
    assert.equal(docx.success, true);
  }
  fs.writeFileSync(process.env.LEX_PERF_RESULT!, JSON.stringify({ samples, memoryBefore, memoryAfter: memory(), cspWarnings: [...new Set(errors)] }, null, 2));
  closeDb();
  win.destroy();
}
void main().then(() => app.exit(0)).catch(error => { console.error(error); app.exit(1); });
