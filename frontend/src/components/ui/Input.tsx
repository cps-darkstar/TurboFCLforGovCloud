import { clsx } from 'clsx';
import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input: React.FC<InputProps> = ({ 
  className,
  error,
  ...props 
}) => {
  return (
    <input
      className={clsx(
        'block w-full px-3 py-2 border rounded-md shadow-sm placeholder-text-muted',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
        'text-text-primary bg-background-primary',
        error 
          ? 'border-semantic-error' 
          : 'border-border-subtle hover:border-border-default',
        className
      )}
      {...props}
    />
  );
};
