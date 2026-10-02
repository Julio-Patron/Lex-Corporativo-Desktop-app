import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-card">
          <AlertTriangle className="mx-auto text-red-600" size={32} aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">Algo salió mal</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            La pantalla encontró un error inesperado. Tus documentos guardados en el portafolio no se ven afectados.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-legal-950 px-4 text-sm font-semibold text-white hover:bg-legal-800"
          >
            <RefreshCw size={16} aria-hidden="true" /> Volver a cargar
          </button>
        </div>
      </div>
    );
  }
}
