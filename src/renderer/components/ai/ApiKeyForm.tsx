import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, KeyRound } from 'lucide-react';
import type { AppSettings, ByokProviderId } from '../../../preload/types';
import { DEFAULT_BYOK_MODELS } from '../../../shared/byok-models';
import { providerLabel, useUiStore } from '../../store/useUiStore';
import { Badge, Button, Field, RadioGroup, TextInput } from '../ui';
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
  const userTouchedRef = useRef(false);
  const hydratedSettingsRef = useRef(Boolean(settings));

  const providerState = settings?.providers[provider];
  const hasStoredKey = Boolean(providerState?.hasApiKey);
  const isActive = Boolean(settings?.enabled && settings.provider === provider);

  useEffect(() => {
    if (!settings || hydratedSettingsRef.current || userTouchedRef.current) return;
    hydratedSettingsRef.current = true;
    setProvider(settings.provider);
    setModel(settings.providers[settings.provider]?.model ?? DEFAULT_BYOK_MODELS[settings.provider]);
  }, [settings]);

  useEffect(() => {
    setModel(settings?.providers[provider]?.model ?? DEFAULT_BYOK_MODELS[provider]);
    setApiKey('');
    setError('');
    // Sólo al cambiar de proveedor: los ajustes guardados no deben borrar lo que se escribe.
  }, [provider]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const cleanIpcError = (err: unknown, fallback: string): string => {
    const raw = err instanceof Error ? err.message : String(err || '');
    const cleaned = raw.replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/i, '').trim();
    return cleaned || fallback;
  };

  const connect = async () => {
    if (!hasStoredKey && apiKey.trim().length < 10) {
      setError('Escribe una clave de IA válida.');
      return;
    }
    setBusy('testing');
    setError('');
    try {
      const key = apiKey.trim() || undefined;
      const tested = await window.lexDesktop.byok.testConnection({ provider, model: model.trim() || undefined, apiKey: key });
      const resolvedModel = tested.model || model.trim() || undefined;
      const saved = await window.lexDesktop.byok.saveSettings({ enabled: true, provider, model: resolvedModel, apiKey: key });
      if (!mountedRef.current) return;
      setSettings(saved);
      setModel(saved.providers[provider]?.model ?? DEFAULT_BYOK_MODELS[provider]);
      setApiKey('');
      void refreshRuntimeHealth();
      notify(`${providerLabel(provider)} quedó conectado.`, 'success', 'IA conectada');
      onConnected?.(saved);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(cleanIpcError(err, `No se pudo conectar con ${providerLabel(provider)}.`));
    } finally {
      if (mountedRef.current) setBusy(null);
    }
  };

  const saveWithoutTest = async () => {
    if (!hasStoredKey && apiKey.trim().length < 10) {
      setError('Escribe una clave de IA válida.');
      return;
    }
    setBusy('testing');
    setError('');
    try {
      const key = apiKey.trim() || undefined;
      const saved = await window.lexDesktop.byok.saveSettings({
        enabled: true,
        provider,
        model: model.trim() || undefined,
        apiKey: key,
      });
      if (!mountedRef.current) return;
      setSettings(saved);
      setModel(saved.providers[provider]?.model ?? DEFAULT_BYOK_MODELS[provider]);
      setApiKey('');
      void refreshRuntimeHealth();
      notify(`Clave de ${providerLabel(provider)} guardada.`, 'info', 'Clave guardada');
      onConnected?.(saved);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(cleanIpcError(err, 'No se pudo guardar la clave de IA.'));
    } finally {
      if (mountedRef.current) setBusy(null);
    }
  };

  const clearKey = async () => {
    setBusy('clearing');
    setError('');
    try {
      const saved = await window.lexDesktop.byok.clearKey({ provider });
      if (!mountedRef.current) return;
      setSettings(saved);
      void refreshRuntimeHealth();
      notify(`Se eliminó la clave de ${providerLabel(provider)}.`, 'info');
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(cleanIpcError(err, 'No se pudo eliminar la clave de IA.'));
    } finally {
      if (mountedRef.current) setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <RadioGroup
        label="Proveedor de IA"
        value={provider}
        onChange={(nextProvider) => { userTouchedRef.current = true; setProvider(nextProvider); }}
        disabled={busy !== null}
        className="grid gap-3 sm:grid-cols-3"
        optionClassName={(selected) => cn(
          'relative rounded-xl border p-4 text-left transition-all disabled:cursor-wait',
          selected
            ? 'border-blue-600 bg-blue-50/35 ring-1 ring-blue-600/20'
            : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60',
        )}
        options={PROVIDERS.map((id) => {
          const state = settings?.providers[id];
          const selected = provider === id;
          const modelName = state?.model || DEFAULT_BYOK_MODELS[id];
          return {
            value: id,
            label: (
              <>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-legal-950">{providerLabel(id)}</span>
                  <span
                    className={cn(
                      'h-2.5 w-2.5 shrink-0 rounded-full transition-colors',
                      selected ? 'bg-blue-600' : 'bg-slate-200',
                    )}
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-1 block truncate text-xs text-slate-500">{modelName}</span>
                <span className="mt-2 block text-[11px] font-semibold text-slate-500">
                  {settings?.enabled && settings.provider === id ? 'En uso' : state?.hasApiKey ? 'Clave guardada' : 'Sin clave'}
                </span>
              </>
            ),
          };
        })}
      />

      <div className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-legal-950">Clave de {providerLabel(provider)}</p>
            <p className="text-xs text-slate-500">
              Se guarda cifrada con tu usuario de Windows.
            </p>
          </div>
          {hasStoredKey && (
            <Badge tone="success" className="gap-1.5 px-2.5 py-0.5">
              <CheckCircle2 size={12} aria-hidden="true" />
              {isActive ? 'Clave activa' : 'Clave guardada'}
            </Badge>
          )}
        </div>

        <Field
          label="Clave de tu cuenta de IA"
          htmlFor={keyInputId}
          hint={hasStoredKey
            ? 'Ya hay una clave guardada. Deja este campo vacío para conservarla.'
            : 'Sólo se usa cuando pides redactar, revisar con IA o preguntar en la ayuda.'}
        >
          <div className="relative">
            <KeyRound size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" aria-hidden="true" />
            <TextInput
              id={keyInputId}
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => { userTouchedRef.current = true; setApiKey(event.target.value); }}
              placeholder={hasStoredKey ? '••••••••••••' : `Pega aquí tu clave de ${providerLabel(provider)}`}
              className="bg-white pl-9"
            />
          </div>
        </Field>

        <div>
          <button
            type="button"
            onClick={() => setModelOpen((open) => !open)}
            aria-expanded={modelOpen}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-legal-950"
          >
            <ChevronDown size={15} className={cn('transition-transform', modelOpen && 'rotate-180')} />
            Modelo: {model || DEFAULT_BYOK_MODELS[provider]}
          </button>
          {modelOpen && (
            <div className="mt-2">
              <Field label="Nombre del modelo" htmlFor={modelInputId} hint={`Predeterminado: ${DEFAULT_BYOK_MODELS[provider]}. Cámbialo sólo si tu cuenta usa otro modelo.`}>
                <TextInput id={modelInputId} value={model} onChange={(event) => { userTouchedRef.current = true; setModel(event.target.value); }} className="bg-white" />
              </Field>
            </div>
          )}
        </div>

        {error && <p className="text-sm font-medium text-red-700" role="alert">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button onClick={() => void connect()} isLoading={busy === 'testing'} disabled={busy !== null || (!hasStoredKey && apiKey.trim().length < 10)}>
            {busy !== 'testing' && <CheckCircle2 size={16} />}
            {isActive && !apiKey ? 'Probar conexión' : 'Probar y conectar'}
          </Button>
          {error && (hasStoredKey || apiKey.trim().length >= 10) && (
            <Button variant="secondary" onClick={() => void saveWithoutTest()} disabled={busy !== null}>
              Guardar clave sin probar
            </Button>
          )}
          {showAdvanced && hasStoredKey && (
            <Button variant="ghost" onClick={() => void clearKey()} isLoading={busy === 'clearing'} disabled={busy !== null}>
              Eliminar clave
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

