import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-bold uppercase tracking-wider rounded-full select-none';

  const variants = {
    primary: 'bg-[#eef3fc] text-[#597ecf] border border-[#597ecf]/30',
    secondary: 'bg-[#f1f3f6] text-[#57627a] border border-[#d4d8df]',
    accent: 'bg-[#eff2f7] text-[#57627a] border border-[#cbd3e0]',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    neutral: 'bg-gray-100 text-gray-700 border border-gray-200',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 leading-none',
    md: 'text-xs px-2.5 py-1 leading-tight',
  };

  return (
    <span className={clsx(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
};

export default Badge;
