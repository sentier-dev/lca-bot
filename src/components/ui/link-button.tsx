import Link from 'next/link'
import { cn } from '@/lib/cn'

interface LinkButtonProps {
  href: string
  className?: string
  children: React.ReactNode
}

export function LinkButton({ href, className, children }: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'ink-gradient text-on-primary font-semibold px-4 py-2 text-sm rounded-lg',
        'shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        className,
      )}
    >
      {children}
    </Link>
  )
}
