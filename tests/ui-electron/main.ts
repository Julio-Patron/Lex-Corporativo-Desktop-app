import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const profile = process.env.LEX_UI_TEST_ROOT!;
const baseline = process.env.LEX_UI_BASELINE === '1';
const output = path.join(root, 'reports', 'ux-ui', baseline ? 'layout-before' : 'restructure-after');
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', profile);
app.setPath('sessionData', profile);
(app as typeof app & { setAppPath(value: string): void }).setAppPath(root);
const screens: unknown[] = [];
const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  await app.whenReady();
  const { registerIpcHandlers } = await import('../../src/main/ipc');
  registerIpcHandlers();
  ipcMain.handle('update:check-now', () => ({ ok: false, status: 'dev-mode' }));
  // Capturas del renderer en Electron; la firma y la interacción con controles
  // nativos se aceptan por separado en Windows instalado.
  const win = new BrowserWindow({ width: 1400, height: 900, show: false,
    titleBarStyle: 'hidden', titleBarOverlay: { color: '#0f172a', symbolColor: '#c5a059', height: 40 },
    webPreferences: { offscreen: true, preload: path.join(root, 'out/preload/index.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  const { registerRecoveryHandlers } = await import('../../src/main/ipc/recovery.handler');
  const documentUrl = pathToFileURL(path.join(root, 'out/renderer/index.html')).href;
  registerRecoveryHandlers(event => event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame && event.senderFrame.url.split('#')[0] === documentUrl);
  const js = (source: string) => win.webContents.executeJavaScript(source, true);
  const waitFor = async (source: string) => {
    const start = Date.now();
    while (!await js(source)) {
      if (Date.now() - start > 20_000) throw new Error(`Tiempo agotado: ${source}`);
      await delay(100);
    }
  };
  const click = async (text: string, selector = 'button') => {
    await js(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(selector)})].find(e => e.textContent.trim() === ${JSON.stringify(text)}); if (!e) throw Error(${JSON.stringify(text)}); e.click(); })()`);
    await delay();
  };
  const clickSelector = async (selector: string) => {
    await js(`document.querySelector(${JSON.stringify(selector)}).click()`);
    await delay();
  };
  const routeTo = async (route: string, zoom: number) => {
    await js(`location.hash = ${JSON.stringify('#' + route)}`);
    await delay(450);
    const heading = route === '/' ? 'Inicio' : route.startsWith('/configuracion') ? 'Configuración' : ({ '/estudio/generar': 'Generar', '/estudio/auditar': 'Auditar', '/fundamentador': 'Fundamentador', '/leyes': 'Leyes', '/estudio/portafolio': 'Portafolio' })[route];
    await waitFor(`document.querySelector('h1')?.textContent === ${JSON.stringify(heading)}`);
    win.webContents.setZoomFactor(zoom);
    await delay(200);
  };
  const shot = async (name: string) => {
    await js('document.fonts.ready.then(() => true)');
    await js('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    await delay(300);
    const geometry = await js(`(() => {
      const rect = e => { const r = e.getBoundingClientRect(); return { top:r.top,left:r.left,right:r.right,bottom:r.bottom }; };
      const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
      const native = navigator.windowControlsOverlay?.getTitlebarAreaRect();
      const boundary = native?.height || 40;
      const dialogs = [...document.querySelectorAll('[role=dialog]')];
      const scope = dialogs.at(-1) || document.querySelector('main');
      const clipped = [...scope.querySelectorAll('a,button,input,select,textarea,summary')].filter(visible).filter(e => { const r=rect(e); return r.right > innerWidth + 1 || r.left < -1; }).map(e => e.textContent || e.getAttribute('aria-label'));
      return { width:innerWidth,height:innerHeight,boundary,main:rect(document.querySelector('main')),sidebar:rect(document.querySelector('aside')),dialogs:dialogs.map(rect),clipped,
        readingHeight: document.querySelector('.document-dialog-body > article, .document-dialog-body > section > div')?.getBoundingClientRect().height ?? null,
        title:document.querySelector('h1')?.textContent,
        shellOverflow:document.documentElement.scrollWidth > innerWidth + 1 };
    })()`);
    screens.push({ name, zoom: win.webContents.getZoomFactor(), ...geometry });
    fs.writeFileSync(path.join(output, `${name}.png`), (await win.webContents.capturePage()).toPNG());
    if (!baseline) {
      assert.ok(geometry.main.top >= geometry.boundary - 1, `${name}: contenido bajo controles nativos`);
      assert.ok(geometry.sidebar.top >= geometry.boundary - 1, `${name}: sidebar bajo controles nativos`);
      assert.ok(geometry.dialogs.every((r: { top: number; bottom: number }) => r.top >= geometry.boundary - 1 && r.bottom <= geometry.height + 1), `${name}: diálogo dentro del área útil`);
      assert.deepEqual(geometry.clipped, [], `${name}: controles sin recortes horizontales`);
      assert.equal(geometry.shellOverflow, false, `${name}: sin desbordamiento horizontal`);
      if (geometry.readingHeight !== null) assert.ok(geometry.readingHeight >= 80, `${name}: texto con espacio de lectura`);
    }
    console.log(`[ui] ${name}: ${geometry.width} × ${geometry.height}`);
  };
  try {
    await win.loadFile(path.join(root, 'out/renderer/index.html'));
    // Una ventana oculta no recibe foco del SO. Emularlo permite que Chromium
    // emita eventos de teclado/foco sin abrir una ventana sobre el escritorio.
    win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled', { enabled: true });
    await waitFor('!!document.querySelector("[role=dialog]")');
    await shot('bienvenida');
    await click('Continuar');
    await click('Ahora no');
    await waitFor('!document.querySelector("[role=dialog]")');
    await routeTo('/estudio/auditar', 1);
    await click('Generar', 'nav[aria-label="Secciones del Estudio"] a');
    await waitFor(`location.hash === '#/estudio/generar' && document.querySelector('h1')?.textContent === 'Generar'`);
    await click('Portafolio', 'nav[aria-label="Secciones del Estudio"] a');
    await waitFor(`location.hash === '#/estudio/portafolio' && document.querySelector('h1')?.textContent === 'Portafolio'`);
    assert.equal(await js(`document.querySelector('nav[aria-label="Navegación principal"] a[aria-current="page"]')?.getAttribute('href')`), '#/estudio');
    const routes = [['inicio','/'], ['generar','/estudio/generar'], ['auditar','/estudio/auditar'], ['fundamentador','/fundamentador'], ['leyes','/leyes'], ['portafolio','/estudio/portafolio'], ['ia','/configuracion'], ['datos','/configuracion?tab=datos'], ['acerca','/configuracion?tab=acerca']];
    const sizes = process.env.LEX_UI_SCOPE === 'sidebar' ? [] : [[1400,900,1], [1024,768,1], [720,600,1], [1024,768,1.5], [720,600,1.5], [1024,768,0.8]];
    for (const [width, height, zoom] of sizes) {
      win.setContentSize(width, height);
      win.webContents.setZoomFactor(zoom);
      for (const [name, route] of routes) {
        await routeTo(route, zoom);
        await shot(`${width}-${zoom}-${name}`);
      }
      await click('Ayuda');
      await shot(`${width}-${zoom}-ayuda`);
      await js(`document.querySelector('[aria-label="Cerrar ayuda"]').click()`);
      await waitFor('!document.querySelector("[role=dialog]")');
      await routeTo('/leyes', zoom);
      assert.equal(await js(`document.querySelector('a[href="https://www.diputados.gob.mx/LeyesBiblio/index.htm"]')?.target`), '_blank');
      assert.equal(await js(`!![...document.querySelectorAll('main button')].find(e => /Descargar|Leer/.test(e.textContent))`), false);
      await routeTo('/estudio/generar', zoom);
      assert.equal(await js(`document.querySelector('main details')?.open`), false);
      await click('Usar una plantilla precargada', 'summary');
      await clickSelector('button[aria-label^="Ver "]');
      await shot(`${width}-${zoom}-plantilla`);
      await js(`document.querySelector('[role="dialog"]').scrollTop = document.querySelector('[role="dialog"]').scrollHeight`);
      await shot(`${width}-${zoom}-plantilla-acciones`);
      await clickSelector('[aria-label="Cerrar vista previa"]');
      await click('Con IA');
      await shot(`${width}-${zoom}-formulario`);
      await click('Agregar cláusulas sugeridas', 'summary');
      await shot(`${width}-${zoom}-clausulas`);
      await click('Cambiar');
      await routeTo('/estudio/auditar', zoom);
      await click('Alcance y límites', 'summary');
      await shot(`${width}-${zoom}-alcance`);
    }
    win.webContents.setZoomFactor(1);
    win.setContentSize(1400, 900);
    await routeTo('/', 1);
    await clickSelector('[aria-label="Ocultar automáticamente"]');
    await js(`document.querySelector('main').focus()`);
    await delay(250);
    assert.equal(await js(`Math.round(document.querySelector('aside').getBoundingClientRect().width)`), 72);
    await shot('sidebar-retraida');
    await js(`document.querySelector('nav[aria-label="Navegación principal"] a').focus()`);
    await delay(250);
    assert.equal(await js(`Math.round(document.querySelector('aside').getBoundingClientRect().width)`), 260);
    await shot('sidebar-teclado');
    await clickSelector('[aria-label="Fijar panel"]');
    await js(`document.querySelector('main').focus()`);
    await shot('sidebar-fija');
  } finally {
    fs.writeFileSync(path.join(output, 'audit.json'), JSON.stringify({ baseline, scope: process.env.LEX_UI_SCOPE ?? 'complete', electron: process.versions.electron, platform: process.platform, screens }, null, 2));
    win.destroy();
  }
}

main().then(() => app.exit(0)).catch(error => { console.error(error); app.exit(1); });
