'use client'

import { useTranslations } from 'next-intl'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ reset }: ErrorProps) {
  const t = useTranslations('common')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="font-headline text-6xl font-bold text-on-surface">500</h1>
      <p className="mt-4 text-lg text-on-surface-variant">
        {t('error')}
      </p>
      <button
        onClick={reset}
        className="mt-8 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        {t('tryAgain')}
      </button>
    </div>
  )
}
