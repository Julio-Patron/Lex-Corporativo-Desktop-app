import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Callout, Card, SectionTitle, Toggle } from '../../components/ui';
import { useUiStore } from '../../store/useUiStore';

export function AboutPanel() {
  const settings = useUiStore((state) => state.settings);
  const setSettings = useUiStore((state) => state.setSettings);
  const update = useUiStore((state) => state.update);
  const notify = useUiStore((state) => state.notify);
  const [version, setVersion] = useState('');
  const [corpus, setCorpus] = useState<{ version: string; laws: number; provisions: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');
  const [savingAuto, setSavingAuto] = useState(false);

  useEffect(() => {
    window.lexDesktop.settings.getAppVersion().then(setVersion).catch(() => setVersion(''));
    window.lexDesktop.legalCorpus.list()
      .then((overview) => setCorpus({ version: overview.corpusVersion, laws: overview.lawsCount, provisions: overview.provisionsCount }))
      .catch(() => setCorpus(null));
  }, []);

  const checkNow = async () => {
    setChecking(true);
    setCheckMessage('');
    try {
      const result = await window.lexDesktop.settings.checkForUpdates();
      if (!result.ok) setCheckMessage(result.message || 'No se pudo buscar actualizaciones.');
      else if (result.version && result.version !== version) setCheckMessage(`Hay una versión nueva (${result.version}); se descargará en segundo plano.`);
      else setCheckMessage('Ya tienes la versión más reciente.');
    } catch (error: any) {
      setCheckMessage(error?.message || 'No se pudo buscar actualizaciones.');
    } finally {
      setChecking(false);
    }
  };

  const toggleAutomatic = async (automaticUpdatesEnabled: boolean) => {
    setSavingAuto(true);
    try {
      setSettings(await window.lexDesktop.settings.savePreferences({ automaticUpdatesEnabled }));
      notify(automaticUpdatesEnabled ? 'Las actualizaciones se buscarán al iniciar la app.' : 'Actualizaciones automáticas desactivadas.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo guardar la preferencia.', 'error');
    } finally {
      setSavingAuto(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle title="Lex Corporativo Desktop" description={version ? `Versión ${version}` : undefined} />
        {corpus && (
          <p className="text-sm text-slate-600">
            Corpus {corpus.version}: {corpus.laws} leyes y {corpus.provisions.toLocaleString('es-MX')} disposiciones verificadas contra sus fuentes oficiales.
          </p>
        )}
      </Card>

      <Card className="space-y-5">
        <SectionTitle title="Actualizaciones" description="Las versiones nuevas se descargan del sitio oficial de publicación y se instalan al reiniciar." />
        {update.status === 'downloaded' && (
          <Callout
            tone="success"
            title={`Actualización lista${update.version ? `: versión ${update.version}` : ''}`}
            action={<Button size="sm" onClick={() => window.lexDesktop.settings.installUpdate()}>Reiniciar y actualizar</Button>}
          />
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => void checkNow()} isLoading={checking}>Buscar actualizaciones</Button>
          {checkMessage && <p className="text-sm text-slate-600" role="status">{checkMessage}</p>}
        </div>
        <div className="border-t border-slate-100" />
        <Toggle
          label="Buscar actualizaciones al iniciar"
          description={settings?.strictPrivacy
            ? 'No disponible con la privacidad estricta activa (Configuración › Datos y privacidad).'
            : 'Al abrir la app se consulta si hay una versión nueva y se descarga en segundo plano.'}
          checked={Boolean(settings?.automaticUpdatesEnabled)}
          disabled={!settings || settings.strictPrivacy || savingAuto}
          onChange={(value) => void toggleAutomatic(value)}
        />
      </Card>

      <Card>
        <SectionTitle title="Legal" />
        <div className="flex flex-wrap gap-4 text-sm font-semibold">
          <Link to="/terminos" className="text-legal-950 hover:underline">Términos y condiciones</Link>
          <Link to="/privacidad" className="text-legal-950 hover:underline">Aviso de privacidad</Link>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Lex Corporativo es una herramienta de apoyo. Sus resultados no constituyen asesoría jurídica y deben ser revisados por un profesional.
        </p>
      </Card>
    </div>
  );
}
