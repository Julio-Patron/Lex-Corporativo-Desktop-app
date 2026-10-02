import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installBrowserPreview } from './dev/browser-preview';

// Vista previa en navegador para QA de diseño: Electron siempre inyecta el API
// real y aislado del preload; este simulador sólo existe en desarrollo.
if (import.meta.env.DEV && !window.lexDesktop) {
  installBrowserPreview();
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

// Reporte de violaciones de CSP al proceso principal.
if (window.lexDesktop?.security?.reportCspViolation) {
  document.addEventListener('securitypolicyviolation', (event) => {
    const violation = {
      'document-uri': event.documentURI,
      'referrer': event.referrer,
      'blocked-uri': event.blockedURI,
      'violated-directive': event.violatedDirective,
      'effective-directive': event.effectiveDirective,
      'original-policy': event.originalPolicy,
      'disposition': event.disposition,
      'status-code': event.statusCode,
      'line-number': event.lineNumber,
      'column-number': event.columnNumber,
      'source-file': event.sourceFile,
    };
    window.lexDesktop.security.reportCspViolation(violation).catch(() => undefined);
  });
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
