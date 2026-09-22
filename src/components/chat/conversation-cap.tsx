'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

export function ConversationCap() {
  const t = useTranslations('chat.cap')
  return (
    <div className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface flex flex-wrap items-center justify-between gap-3" data-testid="conversation-cap">
      <div>
        <p className="font-semibold">{t('title')}</p>
        <p className="text-on-surface-variant text-xs">{t('body')}</p>
      </div>
      <Link href="/chat" className="ink-gradient text-on-primary text-sm font-semibold px-4 py-2 rounded-lg">{t('cta')}</Link>
    </div>
  )
}
