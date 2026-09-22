'use client'
// Every consumer (chat-view, dashboard-view, sidebar) is itself a 'use
// client' component that renders <LoadingDots>/<LoadingSkeleton> directly in
// its own JSX rather than passing it down as `children`. React's Server
// Components model forbids importing a Server Component into a Client
// Component that way — the Server Component would need to ship its
// (potentially async/server-only) code into the client bundle. So this stays
// a Client Component using useTranslations rather than an async Server
// Component using getTranslations; converting it would break every call site.

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/cn'

interface LoadingDotsProps {
  className?: string
}

export function LoadingDots({ className }: LoadingDotsProps) {
  const t = useTranslations('ui.loading')

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} aria-label={t('dotsAria')}>
      <span className="w-2 h-2 rounded-full bg-outline animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 rounded-full bg-outline animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 rounded-full bg-outline animate-bounce" />
    </span>
  )
}

interface LoadingSkeletonProps {
  className?: string
  lines?: number
}

export function LoadingSkeleton({ className, lines = 3 }: LoadingSkeletonProps) {
  const t = useTranslations('ui.loading')

  return (
    <div className={cn('animate-pulse space-y-3', className)} aria-label={t('skeletonAria')}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 rounded bg-surface-container-high',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  )
}
