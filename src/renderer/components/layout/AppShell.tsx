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
      <AppEffects />
      <Sidebar />
      <main id="main-content" className="flex min-w-0 flex-1 flex-col">
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
