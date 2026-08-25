import React from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'accent' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none';

    const variants = {
      primary: 'bg-[#597ecf] hover:bg-[#486cb8] text-white shadow-xs shadow-[#597ecf]/20',
      secondary: 'bg-[#f1f3f6] hover:bg-[#e2e6eb] text-[#57627a] border border-[#d4d8df]',
      outline: 'bg-white hover:bg-[#f4f7fa] text-[#000000] border border-[#e2e8f0] shadow-xs',
      accent: 'bg-[#57627a] hover:bg-[#434c60] text-white shadow-xs shadow-[#57627a]/20',
      ghost: 'text-[#57627a] hover:bg-[#eff2f7] hover:text-[#000000]',
      danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
      md: 'h-[42px] px-4 text-sm rounded-xl gap-2',
      lg: 'h-12 px-6 text-base rounded-2xl gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
