import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { AppNotification } from '../types';

const ICONS = {
  error: <AlertCircle className="text-red-600" size={20} aria-hidden="true" />,
  success: <CheckCircle2 className="text-emerald-600" size={20} aria-hidden="true" />,
  warning: <AlertTriangle className="text-amber-600" size={20} aria-hidden="true" />,
  info: <Info className="text-blue-600" size={20} aria-hidden="true" />,
};

interface NotificationHubProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
}

export function NotificationHub({ notifications, onDismiss }: NotificationHubProps) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[130] flex w-full max-w-sm flex-col gap-2" aria-live="polite">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          role={notification.type === 'error' ? 'alert' : 'status'}
          className="pointer-events-auto flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-dialog animate-fade-in-up"
        >
          {ICONS[notification.type]}
          <div className="min-w-0 flex-1">
            {notification.title && <p className="text-sm font-semibold text-slate-950">{notification.title}</p>}
            <p className="text-sm leading-relaxed text-slate-700">{notification.message}</p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(notification.id)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar aviso"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
