import React from 'react';
import { NotificationHub } from '../NotificationHub';
import { ProcessingSetupDialog } from '../ai/ProcessingSetupDialog';
import { AppEffects } from './AppEffects';
import { HelpPanel } from './HelpPanel';
import { OnboardingDialog } from './OnboardingDialog';
import { Sidebar } from './Sidebar';
import { UpdateBanner } from './UpdateBanner';
import { retryDraftRecovery, useRecoveryStatus } from '../../lib/draft-recovery';

export function AppShell({ children }: { children: React.ReactNode }) {
  const recovery = useRecoveryStatus();
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-legal-paper font-sans text-legal-950">
      <div className="app-titlebar window-drag-region shrink-0 bg-legal-950" aria-hidden="true" />
      <a
        href="#main-content"
        onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-[calc(var(--window-titlebar-height)+8px)] focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:shadow-dialog"
      >
        Saltar al contenido
      </a>
      <AppEffects />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main id="main-content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">
          {recovery.message && <div role={recovery.error ? 'alert' : 'status'} className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-slate-800">
            {recovery.message}{recovery.error && <button type="button" className="ml-3 font-semibold underline" onClick={retryDraftRecovery}>Reintentar copia</button>}
          </div>}
          <div className="min-h-0 flex-1">{children}</div>
          <UpdateBanner />
        </main>
      </div>
      <NotificationHub />
      <ProcessingSetupDialog />
      <HelpPanel />
      <OnboardingDialog />
    </div>
  );
}
