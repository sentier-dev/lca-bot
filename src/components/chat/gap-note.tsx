'use client'

import { useTranslations } from 'next-intl'
import { Icon } from '@/components/ui/icon'

export function GapNote() {
  const t = useTranslations('chat.gap')
  return (
    <p className="mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-on-surface" role="note" data-testid="gap-note">
      <Icon name="info" size="sm" className="text-warning mt-0.5" />
      <span>{t('note')}</span>
    </p>
  )
}
