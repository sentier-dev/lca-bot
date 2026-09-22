import { forwardRef } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'ink' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const VARIANT_CLASSES: Record<Variant, string> = {
  ink: 'ink-gradient text-on-primary font-semibold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform',
  secondary:
    'bg-surface-container-highest text-on-surface font-semibold hover:bg-surface-dim border border-outline-variant/30',
  ghost: 'bg-transparent text-primary hover:underline underline-offset-4',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'py-3 px-6 text-base rounded-xl',
  lg: 'py-4 px-8 text-lg rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ink', size = 'md', className, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...rest}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
