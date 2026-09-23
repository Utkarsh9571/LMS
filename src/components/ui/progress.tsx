import React from 'react';

export interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning';
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  label,
  showPercent = false,
  size = 'md',
  variant = 'primary',
  className = ''
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  const colors = {
    primary: 'bg-blue-600 dark:bg-blue-500',
    success: 'bg-emerald-600 dark:bg-emerald-500',
    warning: 'bg-amber-500 dark:bg-amber-400'
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
          {label && <span>{label}</span>}
          {showPercent && <span className="font-bold text-slate-900 dark:text-white">{percentage}%</span>}
        </div>
      )}
      <div className={`w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${colors[variant]}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
};
