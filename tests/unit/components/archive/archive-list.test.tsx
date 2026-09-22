import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, cleanup, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { ArchiveList } from '@/components/archive/archive-list'
import type { ConversationListItem } from '@/hooks/use-conversations'

afterEach(cleanup)

const item = (i: number): ConversationListItem => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  title: `Chat ${i}`,
  preview: null,
  messageCount: 2,
  updatedAt: new Date(i * 1000).toISOString(),
  createdAt: new Date(i * 1000).toISOString(),
})

describe('ArchiveList', () => {
  it('renders one row per item', () => {
    renderWithIntl(<ArchiveList items={[item(1), item(2), item(3)]} hasMore={false} loadingMore={false} onLoadMore={vi.fn()} onDelete={vi.fn()} onRename={vi.fn()} />)

    expect(screen.getAllByTestId('archive-row')).toHaveLength(3)
  })

  it('hides the load more button when there is no more', () => {
    renderWithIntl(<ArchiveList items={[item(1)]} hasMore={false} loadingMore={false} onLoadMore={vi.fn()} onDelete={vi.fn()} onRename={vi.fn()} />)

    expect(screen.queryByTestId('archive-load-more')).toBeNull()
  })

  it('shows the load more button and calls onLoadMore', () => {
    const onLoadMore = vi.fn()
    renderWithIntl(<ArchiveList items={[item(1)]} hasMore loadingMore={false} onLoadMore={onLoadMore} onDelete={vi.fn()} onRename={vi.fn()} />)

    const button = screen.getByTestId('archive-load-more')
    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('disables the load more button while loading', () => {
    renderWithIntl(<ArchiveList items={[item(1)]} hasMore loadingMore onLoadMore={vi.fn()} onDelete={vi.fn()} onRename={vi.fn()} />)

    expect(screen.getByTestId('archive-load-more')).toBeDisabled()
  })
})
