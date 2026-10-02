import React, { useId, useRef, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ACCEPTED_DOCUMENT_LABEL, ACCEPTED_DOCUMENT_TYPES, formatFileSize, validateDocumentFile } from '../../lib/files';

const controlClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-legal-800 focus:ring-2 focus:ring-legal-gold/30 disabled:bg-slate-100';

export function Field({ label, hint, children, htmlFor, optional }: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  htmlFor?: string;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-800">
        {label}
        {optional && <span className="ml-1 font-normal text-slate-500">(opcional)</span>}
      </label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-slate-500">{hint}</p>}
    </div>
  );
}

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(controlClass, 'h-10', className)} {...props} />,
);
TextInput.displayName = 'TextInput';

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(controlClass, 'resize-y py-2.5 leading-relaxed', className)} {...props} />,
);
TextArea.displayName = 'TextArea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn(controlClass, 'h-10', className)} {...props} />,
);
Select.displayName = 'Select';

export function Toggle({ checked, onChange, label, description, disabled }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: React.ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn('flex items-start justify-between gap-4', disabled && 'opacity-60')}>
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-semibold text-slate-900">{label}</label>
        {description && <p id={`${id}-description`} className="mt-0.5 text-sm text-slate-600">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-description` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed',
          checked ? 'bg-legal-950' : 'bg-slate-300',
        )}
      >
        <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

// Zona para elegir o arrastrar un documento; valida formato y tamaño antes de aceptarlo.
export function FileDropzone({ file, onFile, onError, title, compact }: {
  file: File | null;
  onFile: (file: File | null) => void;
  onError: (message: string) => void;
  title: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (candidate?: File) => {
    if (!candidate) return;
    const error = validateDocumentFile(candidate);
    if (error) onError(error);
    else onFile(candidate);
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200">
          <FileText size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
          <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => onFile(null)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
          aria-label={`Quitar ${file.name}`}
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        accept(event.dataTransfer.files?.[0]);
      }}
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed text-center transition-colors',
        compact ? 'px-4 py-6' : 'px-6 py-10',
        dragging ? 'border-legal-gold bg-amber-50/60' : 'border-slate-300 bg-slate-50',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_DOCUMENT_TYPES}
        className="hidden"
        onChange={(event) => { accept(event.target.files?.[0]); event.target.value = ''; }}
      />
      <Upload size={compact ? 20 : 26} className="text-slate-400" aria-hidden="true" />
      <p className="mt-2 text-sm font-semibold text-slate-900">{dragging ? 'Suelta el archivo aquí' : title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{ACCEPTED_DOCUMENT_LABEL}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"
      >
        Elegir archivo
      </button>
    </div>
  );
}
