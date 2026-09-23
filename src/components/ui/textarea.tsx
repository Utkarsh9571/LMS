import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  errorId?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, errorId, hint, id, ...props }, ref) => {
    const derivedErrorId = error
      ? errorId || (id ? `${id}-error` : undefined)
      : undefined;

    const baseBorder = error
      ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
      : 'border-slate-300 dark:border-slate-700 focus:ring-blue-600 focus:border-blue-600';

    const textareaClass = `w-full px-3.5 py-2.5 border rounded-lg text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 ${baseBorder} ${className}`.trim();

    return (
      <div className="w-full">
        <textarea
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={derivedErrorId}
          className={textareaClass}
          {...props}
        />
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

Textarea.displayName = 'Textarea';
