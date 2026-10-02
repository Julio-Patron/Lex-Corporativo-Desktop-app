import { create } from 'zustand';
import type { AppSettings, RuntimeHealth } from '../../preload/types';
import type { AppNotification, NotificationType } from '../types';

export type { RuntimeHealth };

const SIDEBAR_KEY = 'lex_sidebar_collapsed';
const MAX_NOTIFICATIONS = 4;

function readSidebarPreference(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1';
  } catch {
    return false;
  }
}

export type UpdateState =
  | { status: 'idle' }
  | { status: 'available'; version: string }
  | { status: 'downloaded'; version?: string };

interface UiState {
  notifications: AppNotification[];
  sidebarCollapsed: boolean;
  runtimeHealth: RuntimeHealth | null;
  runtimeHealthLoading: boolean;
  settings: AppSettings | null;
  processingSetupIntent: string | null;
  helpOpen: boolean;
  update: UpdateState;
  notify: (message: string, type?: NotificationType, title?: string) => void;
  dismissNotification: (id: string) => void;
  toggleSidebar: () => void;
  refreshRuntimeHealth: () => Promise<RuntimeHealth | null>;
  refreshSettings: () => Promise<AppSettings | null>;
  setSettings: (settings: AppSettings) => void;
  requestProcessingSetup: (intent: string) => void;
  dismissProcessingSetup: () => void;
  setHelpOpen: (open: boolean) => void;
  setUpdate: (update: UpdateState) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  notifications: [],
  sidebarCollapsed: readSidebarPreference(),
  runtimeHealth: null,
  runtimeHealthLoading: false,
  settings: null,
  processingSetupIntent: null,
  helpOpen: false,
  update: { status: 'idle' },
  notify: (message, type = 'info', title) => {
    const id = crypto.randomUUID();
    set((state) => ({ notifications: [...state.notifications, { id, type, message, title }].slice(-MAX_NOTIFICATIONS) }));
    const delay = type === 'error' ? 12_000 : type === 'warning' ? 8_000 : 5_000;
    setTimeout(() => get().dismissNotification(id), delay);
  },
  dismissNotification: (id) => set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),
  toggleSidebar: () => set((state) => {
    const sidebarCollapsed = !state.sidebarCollapsed;
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? '1' : '0');
    } catch {
      // La preferencia es opcional; la barra funciona sin almacenamiento local.
    }
    return { sidebarCollapsed };
  }),
  refreshRuntimeHealth: async () => {
    set({ runtimeHealthLoading: true });
    try {
      const runtimeHealth = await window.lexDesktop.runtime.getHealth();
      set({ runtimeHealth, runtimeHealthLoading: false });
      return runtimeHealth;
    } catch {
      set({ runtimeHealthLoading: false });
      return null;
    }
  },
  refreshSettings: async () => {
    try {
      const settings = await window.lexDesktop.byok.getSettings();
      set({ settings });
      return settings;
    } catch {
      return null;
    }
  },
  setSettings: (settings) => set({ settings }),
  requestProcessingSetup: (intent) => set({ processingSetupIntent: intent }),
  dismissProcessingSetup: () => set({ processingSetupIntent: null }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setUpdate: (update) => set({ update }),
}));

// La IA está disponible cuando hay un proveedor activo con API key legible.
export function selectAiReady(state: UiState): boolean {
  return Boolean(state.settings?.enabled && state.settings.hasApiKey);
}

export function providerLabel(provider?: string): string {
  if (provider === 'openai') return 'OpenAI';
  if (provider === 'anthropic') return 'Anthropic';
  return 'Google Gemini';
}
