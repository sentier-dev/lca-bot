'use client'

import { useTranslations } from 'next-intl'
import { useConversations } from '@/hooks/use-conversations'
import { ArchiveList } from './archive-list'
import { ArchiveEmpty } from './archive-empty'
import { LoadingSkeleton } from '@/components/ui/loading'
import { Icon } from '@/components/ui/icon'

export function ArchiveView() {
  const t = useTranslations('archive')
  const tCommon = useTranslations('common')
  const list = useConversations()
  return (
    <div className="px-6 py-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight flex items-center gap-3">
          <Icon name="inventory_2" size="lg" className="text-primary" />
          {t('title')}
        </h1>
        <p className="mt-2 text-on-surface-variant text-sm">{t('subtitle')}</p>
        {!list.loading && !list.error && <p className="mt-1 text-xs font-mono text-on-surface-variant" data-testid="archive-count">{t('count', { count: list.total })}</p>}
      </div>
      {list.loading && <LoadingSkeleton lines={4} />}
      {list.error && (
        <div role="alert" className="rounded-md bg-error-container border border-error/20 px-4 py-3 text-sm text-on-error-container flex items-center justify-between gap-3">
          <span>{t('loadError')}</span>
          <button type="button" onClick={() => void list.refetch()} className="font-semibold underline underline-offset-2">{tCommon('tryAgain')}</button>
        </div>
      )}
      {!list.loading && !list.error && list.items.length === 0 && <ArchiveEmpty />}
      {!list.loading && !list.error && list.items.length > 0 && (
        <ArchiveList items={list.items} hasMore={list.hasMore} loadingMore={list.loadingMore} onLoadMore={() => void list.loadMore()} onDelete={list.remove} onRename={list.rename} />
      )}
    </div>
  )
}
