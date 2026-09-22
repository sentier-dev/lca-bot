'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Icon } from '@/components/ui/icon'

export function ArchiveEmpty() {
  const t = useTranslations('archive.empty')
  return (
    <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-6 py-12 text-center" data-testid="archive-empty">
      <Icon name="inventory_2" size="lg" className="text-on-surface-variant/60" />
      <h2 className="mt-3 font-headline text-xl font-semibold text-on-surface">{t('title')}</h2>
      <p className="mt-1 text-sm text-on-surface-variant">{t('body')}</p>
      <Link href="/chat" className="mt-5 inline-block ink-gradient text-on-primary text-sm font-semibold px-4 py-2 rounded-lg">{t('cta')}</Link>
    </div>
  )
}
