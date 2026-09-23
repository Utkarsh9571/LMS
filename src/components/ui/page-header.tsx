import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  badge,
  children,
  className = ''
}) => {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 ${className}`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
            {description}
          </p>
        )}
        {children}
      </div>

      {actions && (
        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
};
