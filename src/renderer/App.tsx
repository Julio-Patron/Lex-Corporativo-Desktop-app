import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Spinner } from './components/ui';
import { resolveLegacyRoute } from './lib/routes';

const EstudioLayout = lazy(() => import('./features/estudio/EstudioLayout'));
const BuscadorPage = lazy(() => import('./features/buscador/BuscadorPage'));
const DraftingPage = lazy(() => import('./features/drafting/DraftingPage'));
const ReviewPage = lazy(() => import('./features/review/ReviewPage'));
const LawsPage = lazy(() => import('./features/laws/LawsPage'));
const PortfolioPage = lazy(() => import('./features/portfolio/PortfolioPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const PrivacyPolicy = lazy(() => import('./features/legal/PrivacyPolicy'));
const TermsConditions = lazy(() => import('./features/legal/TermsConditions'));

function LegacyRedirect() {
  const location = useLocation();
  return <Navigate to={resolveLegacyRoute(location.pathname, location.search) ?? '/'} replace />;
}

export default function App() {
  const location = useLocation();
  return (
    <AppShell>
      {/* La clave reinicia el límite de errores al cambiar de pantalla. */}
      <ErrorBoundary key={location.pathname}>
        <Suspense fallback={<Spinner label="Cargando…" />}>
          <Routes>
            <Route path="/" element={<BuscadorPage />} />
            <Route path="/estudio" element={<EstudioLayout />}>
              <Route index element={<Navigate to="auditar" replace />} />
              <Route path="auditar" element={<ReviewPage />} />
              <Route path="generar" element={<DraftingPage />} />
              <Route path="portafolio" element={<PortfolioPage />} />
            </Route>
            <Route path="/leyes" element={<LawsPage />} />
            <Route path="/configuracion" element={<SettingsPage />} />
            <Route path="/privacidad" element={<PrivacyPolicy />} />
            <Route path="/terminos" element={<TermsConditions />} />
            <Route path="*" element={<LegacyRedirect />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  );
}
