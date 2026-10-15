import React from 'react';
import { useUiStore } from '../../store/useUiStore';
import { NotificationHub } from '../NotificationHub';
import { ProcessingSetupDialog } from '../ai/ProcessingSetupDialog';
import { AppEffects } from './AppEffects';
import { HelpPanel } from './HelpPanel';
import { OnboardingDialog } from './OnboardingDialog';
import { Sidebar } from './Sidebar';
import { UpdateBanner } from './UpdateBanner';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      <a
        href="#main-content"
        onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:shadow-dialog"
      >
        Saltar al contenido
      </a>
      <AppEffects />
      <Sidebar />
      <main id="main-content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">
        <div className="min-h-0 flex-1">{children}</div>
        <UpdateBanner />
      </main>
      <NotificationHub />
      <ProcessingSetupDialog />
      <HelpPanel />
      <OnboardingDialog />
    </div>
  );
}
