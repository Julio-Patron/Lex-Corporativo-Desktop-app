import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ handlers: new Map<string, Function>(), trusted: true }));
vi.mock('electron', () => ({ ipcMain: {
  handle: (name: string, handler: Function) => state.handlers.set(name, handler),
  on: (name: string, handler: Function) => state.handlers.set(name, handler),
} }));
vi.mock('../lib/byok-settings', () => ({ getByokSettings: () => ({ caseRetentionDays: 30 }) }));
vi.mock('../lib/draft-recovery', () => ({ readDraftRecovery: vi.fn(() => null), writeDraftRecovery: vi.fn() }));
import { registerRecoveryHandlers } from './recovery.handler';
import { writeDraftRecovery } from '../lib/draft-recovery';
beforeEach(() => { vi.clearAllMocks(); state.trusted = true; registerRecoveryHandlers(() => state.trusted); });
const call = (name: string, ...args: unknown[]) => state.handlers.get(`recovery:${name}`)!({}, ...args);

describe('IPC de recuperación', () => {
  it('rechaza origen no autorizado sin tocar el disco', () => {
    state.trusted = false;
    expect(() => call('load')).toThrow();
    expect(call('save', {})).toMatchObject({ ok: false });
    expect(writeDraftRecovery).not.toHaveBeenCalled();
  });
  it('no acepta sesiones antiguas ni escrituras anteriores al vaciado síncrono', () => {
    const { sessionId } = call('load');
    const event = { returnValue: null };
    state.handlers.get('recovery:flush')!(event, { sessionId, revision: 3, snapshot: null });
    expect(event.returnValue).toEqual({ ok: true });
    expect(call('save', { sessionId, revision: 1, snapshot: null })).toEqual({ ok: true });
    expect(writeDraftRecovery).toHaveBeenCalledTimes(1);
    call('load');
    expect(call('save', { sessionId, revision: 4, snapshot: null })).toMatchObject({ ok: false });
    expect(writeDraftRecovery).toHaveBeenCalledTimes(1);
  });
});
