import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({
  children,
  required,
  className = '',
  ...props
}) => {
  return (
    <label
      className={`block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 select-none ${className}`}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-red-500 font-bold">*</span>}
    </label>
  );
};
