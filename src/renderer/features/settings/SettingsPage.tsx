import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, Segmented } from '../../components/ui';
import { parseSettingsTab, type SettingsTab } from '../../lib/routes';
import { AboutPanel } from './AboutPanel';
import { AiPanel } from './AiPanel';
import { DataPanel } from './DataPanel';

const TABS: Array<{ value: SettingsTab; label: string }> = [
  { value: 'ia', label: 'Inteligencia artificial' },
  { value: 'datos', label: 'Datos y privacidad' },
  { value: 'acerca', label: 'Acerca de' },
];

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseSettingsTab(searchParams.get('tab'));

  return (
    <Page title="Configuración" width="narrow">
      <Segmented label="Secciones de configuración" value={tab} options={TABS} onChange={(value) => setSearchParams({ tab: value }, { replace: true })} />
      {tab === 'ia' && <AiPanel />}
      {tab === 'datos' && <DataPanel />}
      {tab === 'acerca' && <AboutPanel />}
    </Page>
  );
}
