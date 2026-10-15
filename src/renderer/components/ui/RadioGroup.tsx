import React from 'react';

interface RadioGroupProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: NoInfer<T>; label: React.ReactNode }>;
  onChange: (value: NoInfer<T>) => void;
  className?: string;
  optionClassName?: (selected: boolean) => string;
  disabled?: boolean;
}

// Un solo punto de entrada con Tab; las flechas cambian la selección y el foco.
export function RadioGroup<T extends string>({ label, value, options, onChange, className, optionClassName, disabled }: RadioGroupProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={className}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => {
            let next: number;
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % options.length;
            else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + options.length - 1) % options.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = options.length - 1;
            else return;
            event.preventDefault();
            const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
            buttons?.[next]?.focus();
            onChange(options[next].value);
          }}
          className={optionClassName?.(value === option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
