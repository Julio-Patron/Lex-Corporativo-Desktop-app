import { ipcMain as electronIpc, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';

export interface IpcSenderEvent {
  sender: unknown;
  senderFrame: { url: string } | null;
}

export interface TrustedWindow {
  webContents: unknown;
  mainFrame: unknown;
  documentUrl: string;
}

function normalizeFileHref(url: URL): string {
  // En Windows, Node puede generar file:///c:/... mientras Chromium normaliza a file:///C:/...
  return url.protocol === 'file:'
    ? url.href.replace(/^file:\/\/\/([a-z]):/i, (_match, drive: string) => `file:///${drive.toUpperCase()}:`)
    : url.href;
}

export function isSameAppDocument(actualUrl: string, expectedUrl: string): boolean {
  try {
    const actual = new URL(actualUrl);
    const expected = new URL(expectedUrl);
    actual.hash = '';
    expected.hash = '';
    // Chromium normaliza http://localhost:puerto a http://localhost:puerto/.
    return normalizeFileHref(actual) === normalizeFileHref(expected);
  } catch {
    return false;
  }
}

/**
 * La ventana principal, su marco principal y el documento de la app son el único origen admitido.
 * El hash de la ruta local no cambia el documento.
 */
export function isTrustedAppSender(event: IpcSenderEvent, expected: TrustedWindow | null): boolean {
  if (!expected || !event.senderFrame) return false;
  return event.sender === expected.webContents
    && event.senderFrame === expected.mainFrame
    && isSameAppDocument(event.senderFrame.url, expected.documentUrl);
}

type Guard = (event: IpcSenderEvent) => boolean;

// Cerrado hasta que el proceso principal instala la ventana real. Un ensayo que no lo haga no abre canales.
let guard: Guard = () => false;

export function setIpcSenderGuard(next: Guard): void {
  guard = next;
}

export function assertTrustedIpcSender(event: IpcSenderEvent): void {
  if (!guard(event)) throw new Error('Origen no autorizado.');
}

type InvokeListener = (event: IpcMainInvokeEvent, ...args: any[]) => unknown;
type OnListener = (event: IpcMainEvent, ...args: any[]) => void;

export const ipcMain = {
  handle(channel: string, listener: InvokeListener): void {
    electronIpc.handle(channel, (event, ...args) => {
      assertTrustedIpcSender(event);
      return listener(event, ...args);
    });
  },
  on(channel: string, listener: OnListener): void {
    electronIpc.on(channel, (event, ...args) => {
      assertTrustedIpcSender(event);
      listener(event, ...args);
    });
  },
};
