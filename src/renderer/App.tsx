import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Spinner } from './components/ui';
import { resolveLegacyRoute } from './lib/routes';

const HomePage = lazy(() => import('./features/home/HomePage'));
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
            <Route path="/" element={<HomePage />} />
            <Route path="/redactar" element={<DraftingPage />} />
            <Route path="/revisar" element={<ReviewPage />} />
            <Route path="/leyes" element={<LawsPage />} />
            <Route path="/portafolio" element={<PortfolioPage />} />
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
