import React, { useEffect, useId, useState } from 'react';
import { ApiKeyForm } from '../../components/ai/ApiKeyForm';
import { Button, Card, Field, SectionTitle, Select, Toggle } from '../../components/ui';
import { providerLabel, useUiStore } from '../../store/useUiStore';

const INPUT_LIMITS = [
  { value: 30_000, label: '30,000 caracteres (menor costo)' },
  { value: 60_000, label: '60,000 caracteres (recomendado)' },
  { value: 120_000, label: '120,000 caracteres' },
  { value: 200_000, label: '200,000 caracteres (documentos extensos)' },
];

export function AiPanel() {
  const settings = useUiStore((state) => state.settings);
  const setSettings = useUiStore((state) => state.setSettings);
  const refreshRuntimeHealth = useUiStore((state) => state.refreshRuntimeHealth);
  const notify = useUiStore((state) => state.notify);
  const limitId = useId();
  const [maxInputChars, setMaxInputChars] = useState(settings?.maxInputChars ?? 60_000);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setMaxInputChars(settings.maxInputChars);
  }, [settings?.maxInputChars]);

  const save = async (patch: { enabled?: boolean; maxInputChars?: number }) => {
    if (!settings) return;
    setSaving(true);
    try {
      const saved = await window.lexDesktop.byok.saveSettings({
        enabled: patch.enabled ?? settings.enabled,
        provider: settings.provider,
        maxInputChars: patch.maxInputChars ?? settings.maxInputChars,
      });
      setSettings(saved);
      void refreshRuntimeHealth();
      notify('Configuración guardada.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo guardar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const limitOptions = INPUT_LIMITS.some((option) => option.value === maxInputChars)
    ? INPUT_LIMITS
    : [...INPUT_LIMITS, { value: maxInputChars, label: `${maxInputChars.toLocaleString('es-MX')} caracteres` }];

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle
          title="Proveedor de IA"
          description="La IA redacta documentos, hace revisiones completas y responde en la ayuda. Usa tu propia API key; los costos y políticas son los de tu proveedor."
        />
        <ApiKeyForm showAdvanced />
      </Card>

      {settings?.hasApiKey && (
        <Card className="space-y-5">
          <Toggle
            label="Funciones con IA activadas"
            description={settings.enabled
              ? `Se usa ${providerLabel(settings.provider)} cuando pides redactar o revisar con IA.`
              : 'La key sigue guardada, pero no se usa hasta que la actives.'}
            checked={settings.enabled}
            disabled={saving}
            onChange={(enabled) => void save({ enabled })}
          />
          <div className="border-t border-slate-100" />
          <Field label="Texto máximo por operación" htmlFor={limitId} hint="Limita cuánto texto del documento se envía al proveedor en cada operación.">
            <div className="flex flex-wrap gap-2">
              <Select id={limitId} value={maxInputChars} onChange={(event) => setMaxInputChars(Number(event.target.value))} className="max-w-xs">
                {limitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <Button variant="secondary" onClick={() => void save({ maxInputChars })} disabled={saving || maxInputChars === settings.maxInputChars}>
                Guardar
              </Button>
            </div>
          </Field>
        </Card>
      )}
    </div>
  );
}
