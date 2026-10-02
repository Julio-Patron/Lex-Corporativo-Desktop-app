import React, { useEffect, useId, useState } from 'react';
import { CheckCircle2, ChevronDown, KeyRound } from 'lucide-react';
import type { AppSettings, ByokProviderId } from '../../../preload/types';
import { DEFAULT_BYOK_MODELS } from '../../../shared/byok-models';
import { providerLabel, useUiStore } from '../../store/useUiStore';
import { Button, Field, TextInput } from '../ui';
import { cn } from '../../lib/utils';

const PROVIDERS: ByokProviderId[] = ['gemini', 'openai', 'anthropic'];

interface ApiKeyFormProps {
  onConnected?: (settings: AppSettings) => void;
  // En Configuración se muestran también el modelo y la eliminación de la key.
  showAdvanced?: boolean;
}

export function ApiKeyForm({ onConnected, showAdvanced = false }: ApiKeyFormProps) {
  const settings = useUiStore((state) => state.settings);
  const setSettings = useUiStore((state) => state.setSettings);
  const refreshRuntimeHealth = useUiStore((state) => state.refreshRuntimeHealth);
  const notify = useUiStore((state) => state.notify);
  const keyInputId = useId();
  const modelInputId = useId();

  const [provider, setProvider] = useState<ByokProviderId>(settings?.provider ?? 'gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(settings?.providers[settings.provider]?.model ?? DEFAULT_BYOK_MODELS.gemini);
  const [modelOpen, setModelOpen] = useState(false);
  const [busy, setBusy] = useState<'testing' | 'clearing' | null>(null);
  const [error, setError] = useState('');

  const providerState = settings?.providers[provider];
  const hasStoredKey = Boolean(providerState?.hasApiKey);
  const isActive = Boolean(settings?.enabled && settings.provider === provider);

  useEffect(() => {
    setModel(settings?.providers[provider]?.model ?? DEFAULT_BYOK_MODELS[provider]);
    setApiKey('');
    setError('');
    // Sólo al cambiar de proveedor: los ajustes guardados no deben borrar lo que se escribe.
  }, [provider]);

  const connect = async () => {
    if (!hasStoredKey && apiKey.trim().length < 10) {
      setError('Escribe una API key válida.');
      return;
    }
    setBusy('testing');
    setError('');
    try {
      const key = apiKey.trim() || undefined;
      await window.lexDesktop.byok.testConnection({ provider, model: model.trim() || undefined, apiKey: key });
      const saved = await window.lexDesktop.byok.saveSettings({ enabled: true, provider, model: model.trim() || undefined, apiKey: key });
      setSettings(saved);
      setApiKey('');
      void refreshRuntimeHealth();
      notify(`${providerLabel(provider)} quedó conectado.`, 'success', 'IA conectada');
      onConnected?.(saved);
    } catch (err: any) {
      setError(err?.message || `No se pudo conectar con ${providerLabel(provider)}.`);
    } finally {
      setBusy(null);
    }
  };

  const clearKey = async () => {
    setBusy('clearing');
    setError('');
    try {
      const saved = await window.lexDesktop.byok.clearKey({ provider });
      setSettings(saved);
      void refreshRuntimeHealth();
      notify(`Se eliminó la API key de ${providerLabel(provider)}.`, 'info');
    } catch (err: any) {
      setError(err?.message || 'No se pudo eliminar la API key.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Proveedor de IA" className="grid gap-2 sm:grid-cols-3">
        {PROVIDERS.map((id) => {
          const state = settings?.providers[id];
          const selected = id === provider;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setProvider(id)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                selected ? 'border-legal-950 bg-slate-50 ring-2 ring-legal-gold/40' : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              <span className="block text-sm font-semibold text-slate-900">{providerLabel(id)}</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {settings?.enabled && settings.provider === id ? 'En uso' : state?.hasApiKey ? 'Key guardada' : 'Sin key'}
              </span>
            </button>
          );
        })}
      </div>

      <Field
        label="API key"
        htmlFor={keyInputId}
        hint={hasStoredKey
          ? `Hay una key guardada${providerState?.apiKeyFingerprint ? ` (huella ${providerState.apiKeyFingerprint})` : ''}. Déjalo vacío para conservarla.`
          : 'Se guarda cifrada por el sistema operativo. Sólo se usa cuando pides redactar, revisar con IA o consultar la ayuda.'}
      >
        <div className="relative">
          <KeyRound size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" aria-hidden="true" />
          <TextInput
            id={keyInputId}
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={hasStoredKey ? '••••••••••••' : `Pega tu API key de ${providerLabel(provider)}`}
            className="pl-9"
          />
        </div>
      </Field>

      <div>
        <button
          type="button"
          onClick={() => setModelOpen((open) => !open)}
          aria-expanded={modelOpen}
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-950"
        >
          <ChevronDown size={16} className={cn('transition-transform', modelOpen && 'rotate-180')} />
          Modelo: {model || DEFAULT_BYOK_MODELS[provider]}
        </button>
        {modelOpen && (
          <div className="mt-2">
            <Field label="Identificador del modelo" htmlFor={modelInputId} hint={`Predeterminado: ${DEFAULT_BYOK_MODELS[provider]}. Cámbialo sólo si tu cuenta usa otro modelo.`}>
              <TextInput id={modelInputId} value={model} onChange={(event) => setModel(event.target.value)} />
            </Field>
          </div>
        )}
      </div>

      {error && <p className="text-sm font-medium text-red-700" role="alert">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void connect()} isLoading={busy === 'testing'} disabled={busy !== null || (!hasStoredKey && apiKey.trim().length < 10)}>
          {busy !== 'testing' && <CheckCircle2 size={16} />}
          {isActive && !apiKey ? 'Probar conexión' : 'Probar y conectar'}
        </Button>
        {showAdvanced && hasStoredKey && (
          <Button variant="ghost" onClick={() => void clearKey()} isLoading={busy === 'clearing'} disabled={busy !== null}>
            Eliminar key
          </Button>
        )}
      </div>
    </div>
  );
}
