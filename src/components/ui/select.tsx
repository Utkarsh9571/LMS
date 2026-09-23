import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  errorId?: string;
  options?: Array<{ value: string; label: string }>;
  hint?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, errorId, hint, id, options, children, ...props }, ref) => {
    const derivedErrorId = error
      ? errorId || (id ? `${id}-error` : undefined)
      : undefined;

    const baseBorder = error
      ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
      : 'border-slate-300 dark:border-slate-700 focus:ring-blue-600 focus:border-blue-600';

    const selectClass = `w-full px-3.5 py-2 border rounded-lg text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 ${baseBorder} ${className}`.trim();

    return (
      <div className="w-full">
        <select
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={derivedErrorId}
          className={selectClass}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
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

Select.displayName = 'Select';
