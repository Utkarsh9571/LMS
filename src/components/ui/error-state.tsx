import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
  className = ''
}: ErrorStateProps) {
  return (
    <div
      className={`rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-5 my-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 rounded-lg shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-red-800 dark:text-red-200">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">
            {message}
          </p>
          {action && <div className="pt-2">{action}</div>}
        </div>
      </div>
    </div>
  );
}
