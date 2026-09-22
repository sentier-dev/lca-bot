import { cn } from '@/lib/cn'

interface IconProps {
  name: string
  filled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = {
  sm: 'text-sm',
  md: 'text-xl',
  lg: 'text-3xl',
} as const

export function Icon({ name, filled = false, className, size = 'md' }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('material-symbols-outlined inline-block leading-none', SIZE_MAP[size], className)}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  )
}
