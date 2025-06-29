import { clsx } from 'clsx';
import React, { LabelHTMLAttributes } from 'react';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({ 
  children,
  required,
  className,
  ...props 
}) => {
  return (
    <label
      className={clsx(
        'block text-sm font-medium text-text-primary mb-1',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-semantic-error ml-1">*</span>}
    </label>
  );
};
