import { clsx } from 'clsx';
import React, { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card: React.FC<CardProps> = ({ 
  children,
  className,
  ...props 
}) => {
  return (
    <div
      className={clsx(
        'bg-background-secondary rounded-lg border border-border-subtle shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader: React.FC<CardHeaderProps> = ({ 
  children,
  className,
  ...props 
}) => {
  return (
    <div
      className={clsx('px-6 py-4 border-b border-border-subtle', className)}
      {...props}
    >
      {children}
    </div>
  );
};

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle: React.FC<CardTitleProps> = ({ 
  children,
  className,
  ...props 
}) => {
  return (
    <h3
      className={clsx('text-lg font-semibold text-text-primary', className)}
      {...props}
    >
      {children}
    </h3>
  );
};
