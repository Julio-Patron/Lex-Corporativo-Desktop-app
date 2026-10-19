import { app, BrowserWindow, session } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isTrustedAppSender, setIpcSenderGuard } from '../../src/main/ipc/trusted-ipc';

// Ensayo de seguridad con el preload y el renderer compilados (out/), handlers reales y perfil temporal.
// Comprueba la frontera IPC (SEC-01), la CSP efectiva en el documento file:// (SEC-02) y el filtro del deep link.
const root = process.cwd();
const profile = process.env.LEX_SECURITY_PROFILE!;
app.setPath('userData', profile);
app.setPath('sessionData', profile);
(app as typeof app & { setAppPath(value: string): void }).setAppPath(root);

const HEALTH_PROBE = "window.lexDesktop.runtime.getHealth().then(r => ({ ok: true, status: r.status }), e => ({ ok: false, message: String((e && e.message) || e) }))";
const RECOVERY_PROBE = "window.lexDesktop.recovery.load().then(() => ({ ok: true }), e => ({ ok: false, message: String((e && e.message) || e) }))";
const UNAUTHORIZED = 'Origen no autorizado.';

function violationProbe(inject: string): string {
  return `new Promise(resolve => {
    let settled = false;
    const done = value => { if (!settled) { settled = true; document.removeEventListener('securitypolicyviolation', handler); resolve(value); } };
    const handler = event => done({ violated: event.violatedDirective, blocked: event.blockedURI });
    document.addEventListener('securitypolicyviolation', handler);
    try { ${inject} } catch (error) { done({ violated: null, error: String(error) }); }
    setTimeout(() => done({ violated: null }), 3000);
  })`;
}

type Probe = { ok: boolean; message?: string; status?: string };
type Violation = { violated: string | null; blocked?: string; error?: string };

async function main() {
  await app.whenReady();
  const { registerIpcHandlers } = await import('../../src/main/ipc');
  const { registerRecoveryHandlers } = await import('../../src/main/ipc/recovery.handler');
  const { installContentSecurityPolicy } = await import('../../src/main/csp');
  const { withContentSecurityPolicy } = await import('../../src/shared/content-security-policy');
  const { handleDeepLink } = await import('../../src/main/protocol');
  const { closeDb } = await import('../../src/main/lib/case-vault');

  const preload = path.join(root, 'out/preload/index.cjs');
  const rendererFile = path.join(root, 'out/renderer/index.html');
  if (!fs.existsSync(preload) || !fs.existsSync(rendererFile)) throw new Error('Falta out/: ejecuta npm run build antes del ensayo de seguridad.');
  const documentUrl = pathToFileURL(rendererFile).href;
  const webPreferences = { offscreen: true, preload, sandbox: true, contextIsolation: true, nodeIntegration: false };

  registerIpcHandlers();
  installContentSecurityPolicy(session.defaultSession);
  const win = new BrowserWindow({ width: 1200, height: 800, show: false, webPreferences });
  const trusted = (event: { sender: unknown; senderFrame: { url: string } | null }) => isTrustedAppSender(event, { webContents: win.webContents, mainFrame: win.webContents.mainFrame, documentUrl });
  setIpcSenderGuard(trusted);
  registerRecoveryHandlers(trusted);
  await win.loadFile(rendererFile);
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await win.webContents.executeJavaScript("document.querySelector('h1')?.textContent === 'Buscador normativo'")) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // SEC-01: sólo el marco principal del documento de la app en la ventana registrada obtiene respuesta.
  const trustedHealth: Probe = await win.webContents.executeJavaScript(HEALTH_PROBE);
  const foreign = new BrowserWindow({ show: false, webPreferences });
  await foreign.loadURL('data:text/html,<title>ajeno</title>');
  const foreignHealth: Probe = await foreign.webContents.executeJavaScript(HEALTH_PROBE);
  const foreignRecovery: Probe = await foreign.webContents.executeJavaScript(RECOVERY_PROBE);
  const clone = new BrowserWindow({ show: false, webPreferences });
  await clone.loadFile(rendererFile);
  const cloneHealth: Probe = await clone.webContents.executeJavaScript(HEALTH_PROBE);
  foreign.destroy();
  clone.destroy();

  // SEC-02: la meta del documento file:// bloquea iframes, plugins, scripts en línea y conexiones externas.
  const metaPolicy: string = await win.webContents.executeJavaScript("document.querySelector('meta[http-equiv=\"Content-Security-Policy\"]')?.content || ''");
  const iframe: Violation = await win.webContents.executeJavaScript(violationProbe("const f = document.createElement('iframe'); f.src = 'https://example.invalid/'; document.body.appendChild(f);"));
  const plugin: Violation = await win.webContents.executeJavaScript(violationProbe("const o = document.createElement('object'); o.data = 'https://example.invalid/x.pdf'; document.body.appendChild(o);"));
  const inlineScript: Violation = await win.webContents.executeJavaScript(violationProbe("const s = document.createElement('script'); s.textContent = 'window.__lexInline = 1'; document.body.appendChild(s);"));
  const inlineExecuted: boolean = await win.webContents.executeJavaScript('window.__lexInline === 1');
  const connect: Violation = await win.webContents.executeJavaScript(violationProbe("fetch('https://example.invalid/').catch(() => undefined);"));
  const header = String(withContentSecurityPolicy({})['Content-Security-Policy']);

  // Deep link: sólo lexcorp://auth llega al renderer.
  let callbacks = 0;
  const originalSend = win.webContents.send.bind(win.webContents);
  win.webContents.send = ((channel: string, ...args: unknown[]) => { if (channel === 'auth:callback') callbacks += 1; return originalSend(channel, ...args); }) as typeof win.webContents.send;
  handleDeepLink('lexcorp://evil/auth/callback?x=1', win);
  handleDeepLink('https://example.invalid/auth/callback', win);
  handleDeepLink('no-es-una-url', win);
  const rejectedDeepLinks = callbacks === 0;
  handleDeepLink('lexcorp://auth/callback#token=sintetico', win);
  const acceptedDeepLink = callbacks === 1;

  // SEC-01 (continuación): el mismo webContents navegado a otro documento deja de ser confiable.
  await win.loadURL('data:text/html,<title>navegado</title>');
  const navigatedHealth: Probe = await win.webContents.executeJavaScript(HEALTH_PROBE);

  const rejected = (probe: Probe) => !probe.ok && (probe.message ?? '').includes(UNAUTHORIZED);
  const checks = [
    { id: 'SEC-01', label: 'La frontera IPC sólo atiende al marco principal del documento de la app en la ventana registrada', ok: trustedHealth.ok && rejected(foreignHealth) && rejected(foreignRecovery) && rejected(cloneHealth) && rejected(navigatedHealth) },
    { id: 'SEC-02', label: 'La CSP del documento bloquea iframes, plugins, scripts en línea y conexiones externas; el encabezado añade frame-ancestors', ok: iframe.violated === 'frame-src' && plugin.violated === 'object-src' && (inlineScript.violated ?? '').startsWith('script-src') && !inlineExecuted && connect.violated === 'connect-src' && !metaPolicy.includes('frame-ancestors') && header.includes("frame-ancestors 'none'") },
    { id: 'PROTO-01', label: 'El deep link lexcorp:// sólo admite el host auth', ok: rejectedDeepLinks && acceptedDeepLink },
  ];
  const report = {
    syntheticOnly: true,
    ipc: { trustedHealth, foreignHealth, foreignRecovery, cloneHealth, navigatedHealth },
    csp: { metaPolicy, header, iframe, plugin, inlineScript, inlineExecuted, connect },
    deepLink: { rejectedDeepLinks, acceptedDeepLink },
    checks,
    status: checks.every(check => check.ok) ? 'pass' : 'findings-open',
    limits: [
      'La ventana del ensayo replica las webPreferences del producto; la configuración real de src/main/index.ts se verifica estáticamente.',
      'frame-ancestors sólo viaja en el encabezado y no aplica a documentos file://; se comprueba la función que lo añade, no una respuesta http.',
      'No se ensayan subframes dentro de la app porque frame-src none los impide; la prueba unitaria de trusted-ipc cubre ese caso.',
    ],
  };
  fs.writeFileSync(process.env.LEX_SECURITY_RESULT!, JSON.stringify(report, null, 2) + '\n');
  closeDb();
  win.destroy();
}
void main().then(() => app.exit(0)).catch(error => { console.error(error); app.exit(1); });
