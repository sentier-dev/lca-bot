import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function NotFound() {
  const t = await getTranslations('system.notFound')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="font-headline text-6xl font-bold text-on-surface">404</h1>
      <p className="mt-4 text-lg text-on-surface-variant">
        {t('message')}
      </p>
      <Link
        href="/chat"
        className="mt-8 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        {t('backHome')}
      </Link>
    </div>
  )
}
