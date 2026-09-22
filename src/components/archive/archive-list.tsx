'use client'

import { useTranslations } from 'next-intl'
import { ArchiveRow } from './archive-row'
import type { ConversationListItem } from '@/hooks/use-conversations'

interface Props {
  items: ConversationListItem[]
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onDelete: (id: string) => Promise<boolean>
  onRename: (id: string, title: string) => Promise<boolean>
}

export function ArchiveList({ items, hasMore, loadingMore, onLoadMore, onDelete, onRename }: Props) {
  const t = useTranslations('archive')
  return (
    <>
      <ul className="space-y-2" data-testid="archive-list">
        {items.map((item) => <ArchiveRow key={item.id} item={item} onDelete={onDelete} onRename={onRename} />)}
      </ul>
      {hasMore && (
        <div className="mt-4 text-center">
          <button type="button" onClick={onLoadMore} disabled={loadingMore} className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-on-surface hover:border-primary/60 disabled:opacity-50" data-testid="archive-load-more">
            {loadingMore ? t('loading') : t('loadMore')}
          </button>
        </div>
      )}
    </>
  )
}
