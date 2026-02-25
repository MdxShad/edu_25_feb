import * as React from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'default' | 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

function renderAsChild(
  children: React.ReactNode,
  className: string,
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const child = React.Children.only(children);
  if (!React.isValidElement(child)) return child;

  return React.cloneElement(child as React.ReactElement<any>, {
    className: cn((child.props as { className?: string }).className, className),
    ...props,
  });
}

export const buttonStyles: Record<ButtonVariant, string> = {
  default: 'bg-zinc-900 text-white hover:bg-zinc-800',
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800',
  secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'bg-transparent text-zinc-900 hover:bg-zinc-100',
  outline: 'border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-900',
};

export const buttonSizes: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
  icon: 'h-10 w-10',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'default', size = 'default', asChild = false, children, ...props },
  ref
) {
  const computed = cn(
    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-white',
    buttonStyles[variant],
    buttonSizes[size],
    className
  );

  if (asChild) {
    return renderAsChild(children, computed, props);
  }

  return (
    <button ref={ref} className={computed} {...props}>
      {children}
    </button>
  );
});
