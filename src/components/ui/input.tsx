import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...rest }, ref) => {
    return (
      <input
        ref={ref}
        className={[
          'w-full rounded-md border border-outline',
          'bg-surface-container-lowest',
          'px-3 py-2 text-sm text-on-surface',
          'placeholder:text-outline',
          'focus:outline-none focus:ring-2 focus-visible:ring-primary/40',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors',
          className,
        ].join(' ')}
        {...rest}
      />
    )
  }
)

Input.displayName = 'Input'
