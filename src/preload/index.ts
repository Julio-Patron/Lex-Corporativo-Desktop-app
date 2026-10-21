import { contextBridge, ipcRenderer } from 'electron';
import type { LexDesktopAPI } from './types';

// Suscripción con baja explícita: cada pantalla retira su propio listener sin
// afectar a las demás.
function subscribe(channel: string, handler: (payload: any) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => handler(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: LexDesktopAPI = {
  recovery: {
    load: () => ipcRenderer.invoke('recovery:load'),
    save: (request) => ipcRenderer.invoke('recovery:save', request),
    flush: (request) => ipcRenderer.sendSync('recovery:flush', request),
  },
  cases: {
    createCase: (payload) => ipcRenderer.invoke('vault:create-case', payload),
    listCases: () => ipcRenderer.invoke('vault:list-cases'),
    getCase: (caseId) => ipcRenderer.invoke('vault:load-case-data', caseId),
    deleteCase: (caseId) => ipcRenderer.invoke('vault:delete-case', caseId),
    saveAnalysis: (payload) => ipcRenderer.invoke('vault:save-analysis', payload),
    saveDraft: (payload) => ipcRenderer.invoke('vault:save-draft', payload),
    deleteAnalysis: (payload) => ipcRenderer.invoke('vault:delete-analysis', payload),
    deleteDraft: (payload) => ipcRenderer.invoke('vault:delete-draft', payload),
    exportAll: (payload) => ipcRenderer.invoke('vault:export-all', payload),
    importAll: (payload) => ipcRenderer.invoke('vault:import-all', payload),
    deleteAll: (payload) => ipcRenderer.invoke('vault:delete-all', payload),
  },
  documents: {
    exportPdf: (payload) => ipcRenderer.invoke('vault:export-pdf', payload),
    exportDocx: (payload) => ipcRenderer.invoke('vault:export-docx', payload),
  },

  analysis: {
    analyzeDocument: (payload) => ipcRenderer.invoke('ipc:analyze', payload),
    onProgress: (cb) => subscribe('engine:progress', (progress) => cb(progress)),
  },
  drafts: {
    generateDraft: (payload) => ipcRenderer.invoke('ipc:draft', payload),
  },
  legalKnowledge: {
    searchRAG: (payload) => ipcRenderer.invoke('ipc:rag-search', payload),
  },
  legalCorpus: {
    list: () => ipcRenderer.invoke('corpus:list'),
  },
  runtime: {
    getHealth: () => ipcRenderer.invoke('runtime:get-health'),
  },
  traceability: {
    getStatus: () => ipcRenderer.invoke('trace:get-status'),
    exportLedger: () => ipcRenderer.invoke('trace:export'),
  },
  byok: {
    getSettings: () => ipcRenderer.invoke('byok:get-settings'),
    saveSettings: (payload) => ipcRenderer.invoke('byok:save-settings', payload),
    clearKey: (payload) => ipcRenderer.invoke('byok:clear-key', payload),
    testConnection: (payload) => ipcRenderer.invoke('byok:test-connection', payload),
  },
  settings: {
    getAppVersion: () => ipcRenderer.invoke('app:version'),
    savePreferences: (payload) => ipcRenderer.invoke('settings:save-preferences', payload),
    onUpdateAvailable: (cb) => subscribe('update:available', (version) => cb(version)),
    onUpdateDownloaded: (cb) => subscribe('update:downloaded', () => cb()),
    checkForUpdates: () => ipcRenderer.invoke('update:check-now'),
    installUpdate: () => ipcRenderer.send('update:install'),
  },
  navigation: {
    onSettings: (cb) => subscribe('nav:settings', () => cb()),
    onHelp: (cb) => subscribe('nav:help', () => cb()),
  },
  assistant: {
    askInstructivo: (payload) => ipcRenderer.invoke('ipc:assistant-ask', payload),
  },
  security: {
    reportCspViolation: (report) => ipcRenderer.invoke('csp:report', report),
  }
};

contextBridge.exposeInMainWorld('lexDesktop', api);
