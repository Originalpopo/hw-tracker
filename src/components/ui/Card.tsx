import React from 'react';
import { clsx } from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'header' | 'interactive' | 'flat';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-white rounded-2xl border border-[#e2e8f0] shadow-xs p-6',
      header: 'flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl gap-4 border border-[#e2e8f0] shadow-xs',
      interactive: 'bg-white rounded-2xl border border-[#e2e8f0] shadow-xs hover:border-[#597ecf]/40 hover:shadow-md transition-all duration-200 p-6',
      flat: 'bg-[#f4f7fa] rounded-2xl border border-[#e2e8f0] p-4',
    };

    return (
      <div ref={ref} className={clsx(variants[variant], className)} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
export default Card;
