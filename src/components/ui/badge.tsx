import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' | 'info';
  size?: 'sm' | 'md';
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: BadgeProps) {
  const variants: Record<string, string> = {
    default:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    secondary:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    success:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    warning:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    destructive:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
    info:
      'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
    outline:
      'bg-transparent text-slate-700 border-slate-300 dark:text-slate-300 dark:border-slate-700'
  };

  const sizes: Record<string, string> = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-xs'
  };

  const badgeClass = `inline-flex items-center font-semibold rounded-full border transition-colors ${
    variants[variant] || variants.default
  } ${sizes[size] || sizes.md} ${className}`.trim();

  return (
    <span className={badgeClass} {...props}>
      {children}
    </span>
  );
}
