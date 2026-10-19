import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isIconOnly?: boolean;
  isFullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isIconOnly = false,
      isFullWidth = false,
      type = 'button',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex max-w-full shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:shrink-0',
          {
            'bg-legal-950 text-white shadow-sm hover:bg-legal-800': variant === 'primary',
            'border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50': variant === 'secondary',
            'text-slate-700 hover:bg-slate-100 hover:text-slate-950': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
            'min-h-9 px-3.5 py-1.5 text-sm': size === 'sm' && !isIconOnly,
            'min-h-10 px-4 py-2 text-sm': size === 'md' && !isIconOnly,
            'min-h-12 px-6 py-2.5 text-base': size === 'lg' && !isIconOnly,
            'h-9 w-9': size === 'sm' && isIconOnly,
            'h-10 w-10': size === 'md' && isIconOnly,
            'h-12 w-12': size === 'lg' && isIconOnly,
            'w-full': isFullWidth,
          },
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
