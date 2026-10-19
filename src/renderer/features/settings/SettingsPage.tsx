import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Database, Info, Sparkles } from 'lucide-react';
import { Badge, Card, Page, RadioGroup } from '../../components/ui';
import { useAiGuard } from '../../hooks/useAiGuard';
import { parseSettingsTab, type SettingsTab } from '../../lib/routes';
import { cn } from '../../lib/utils';
import { providerLabel, useUiStore } from '../../store/useUiStore';
import { AboutPanel } from './AboutPanel';
import { AiPanel } from './AiPanel';
import { DataPanel } from './DataPanel';

const TABS: Array<{ value: SettingsTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { value: 'ia', label: 'Inteligencia artificial', icon: Sparkles },
  { value: 'datos', label: 'Datos y privacidad', icon: Database },
  { value: 'acerca', label: 'Acerca de', icon: Info },
];

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseSettingsTab(searchParams.get('tab'));
  const provider = useUiStore((state) => state.settings?.provider);
  const { aiReady } = useAiGuard();

  return (
    <Page
      title="Configuración"
      description="Preferencias del sistema, conexión BYOK y privacidad del almacenamiento local."
      width="wide"
      actions={(
        <Badge tone={aiReady ? 'success' : 'neutral'} className="gap-1.5 px-3 py-1">
          <Sparkles size={13} aria-hidden="true" />
          {aiReady ? `${providerLabel(provider)} activo` : 'Modo local'}
        </Badge>
      )}
    >
      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start">
        <Card className="p-3">
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Ajustes de estación
          </p>
          <RadioGroup
            label="Secciones de configuración"
            value={tab}
            onChange={(value) => setSearchParams({ tab: value }, { replace: true })}
            className="flex flex-col gap-1"
            optionClassName={(selected) => cn(
              'flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-all',
              selected
                ? 'bg-legal-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-legal-950',
            )}
            options={TABS.map(({ value, label, icon: Icon }) => ({
              value,
              label: (
                <>
                  <Icon size={16} className={tab === value ? 'text-legal-gold' : 'text-slate-400'} aria-hidden="true" />
                  <span>{label}</span>
                </>
              ),
            }))}
          />
        </Card>

        <div className="min-w-0">
          {tab === 'ia' && <AiPanel />}
          {tab === 'datos' && <DataPanel />}
          {tab === 'acerca' && <AboutPanel />}
        </div>
      </div>
    </Page>
  );
}

