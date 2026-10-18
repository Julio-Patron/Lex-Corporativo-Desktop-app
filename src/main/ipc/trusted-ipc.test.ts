import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ handlers: new Map<string, Function>() }));

vi.mock('electron', () => ({
  ipcMain: {
    handle: (name: string, handler: Function) => state.handlers.set(`handle:${name}`, handler),
    on: (name: string, handler: Function) => state.handlers.set(`on:${name}`, handler),
  },
}));

import { ipcMain, isTrustedAppSender, setIpcSenderGuard, type TrustedWindow } from './trusted-ipc';

const documentUrl = 'file:///app/index.html';
const webContents = { id: 'main' };
const mainFrame = { id: 'frame', url: documentUrl };
const expected: TrustedWindow = { webContents, mainFrame, documentUrl };

function sender(overrides: Record<string, unknown> = {}) {
  return {
    sender: webContents,
    senderFrame: mainFrame,
    ...overrides,
  };
}

beforeEach(() => {
  state.handlers.clear();
  setIpcSenderGuard(() => false);
});

describe('isTrustedAppSender', () => {
  it('acepta el marco principal del documento de la aplicación', () => {
    expect(isTrustedAppSender(sender(), expected)).toBe(true);
  });

  it('acepta el mismo documento cuando sólo cambia el hash de la ruta', () => {
    const hashedFrame = { id: 'frame', url: `${documentUrl}#/estudio/auditar` };
    expect(isTrustedAppSender(sender({ senderFrame: hashedFrame }), {
      ...expected,
      mainFrame: hashedFrame,
    })).toBe(true);
  });

  it('rechaza otra ventana, un subframe, un documento navegado y un marco ausente', () => {
    expect(isTrustedAppSender(sender({ sender: { id: 'other' } }), expected)).toBe(false);
    const subframe = { id: 'child', url: documentUrl };
    expect(isTrustedAppSender(sender({ senderFrame: subframe }), expected)).toBe(false);
    const navigated = { id: 'frame', url: 'https://otro.example/index.html' };
    expect(isTrustedAppSender(sender({ senderFrame: navigated }), {
      ...expected,
      mainFrame: navigated,
    })).toBe(false);
    expect(isTrustedAppSender(sender({ senderFrame: null }), expected)).toBe(false);
    expect(isTrustedAppSender(sender(), null)).toBe(false);
  });
});

describe('ipcMain protegido', () => {
  it('no llama al listener si el origen no está autorizado', () => {
    const listener = vi.fn(() => 'ok');
    ipcMain.handle('demo', listener);
    ipcMain.on('demo-event', listener);

    expect(() => state.handlers.get('handle:demo')!(sender())).toThrow(/Origen no autorizado/);
    expect(() => state.handlers.get('on:demo-event')!(sender())).toThrow(/Origen no autorizado/);
    expect(listener).not.toHaveBeenCalled();
  });

  it('llama al listener cuando el guardia acepta el origen', async () => {
    setIpcSenderGuard(event => isTrustedAppSender(event, expected));
    ipcMain.handle('demo', () => 'ok');

    expect(state.handlers.get('handle:demo')!(sender())).toBe('ok');
  });
});
