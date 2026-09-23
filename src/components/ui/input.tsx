import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  errorId?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className = '', error, errorId, hint, leftIcon, rightIcon, id, ...props },
    ref
  ) => {
    const derivedErrorId = error
      ? errorId || (id ? `${id}-error` : undefined)
      : undefined;

    const baseBorder = error
      ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
      : 'border-slate-300 dark:border-slate-700 focus:ring-blue-600 focus:border-blue-600';

    const paddingStyles = `${leftIcon ? 'pl-9' : 'pl-3.5'} ${
      rightIcon ? 'pr-9' : 'pr-3.5'
    }`;

    const inputClass = `w-full ${paddingStyles} py-2 border rounded-lg text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 ${baseBorder} ${className}`.trim();

    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            aria-invalid={!!error}
            aria-describedby={derivedErrorId}
            className={inputClass}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p id={derivedErrorId} className="mt-1 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
