import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, cleanup, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import type { ConversationListItem } from '@/hooks/use-conversations'

const { hook } = vi.hoisted(() => ({ hook: { current: null as unknown } }))
vi.mock('@/hooks/use-conversations', () => ({ useConversations: () => hook.current }))

import { ArchiveView } from '@/components/archive/archive-view'

type ListState = ReturnType<typeof baseList>

function baseList() {
  return {
    items: [] as ConversationListItem[],
    total: 0,
    hasMore: false,
    loading: false,
    loadingMore: false,
    error: false,
    loadMore: vi.fn(),
    remove: vi.fn(),
    rename: vi.fn(),
    refetch: vi.fn(),
  }
}

function renderView(overrides: Partial<ListState> = {}) {
  const list = { ...baseList(), ...overrides }
  hook.current = list
  return { list, ...renderWithIntl(<ArchiveView />) }
}

const item = (i: number): ConversationListItem => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  title: `Chat ${i}`,
  preview: null,
  messageCount: 2,
  updatedAt: new Date(i * 1000).toISOString(),
  createdAt: new Date(i * 1000).toISOString(),
})

afterEach(cleanup)

describe('ArchiveView', () => {
  it('shows a loading skeleton', () => {
    renderView({ loading: true })

    expect(screen.getByLabelText('Loading content')).toBeInTheDocument()
    expect(screen.queryByTestId('archive-list')).toBeNull()
  })

  it('shows an error alert with a retry that calls refetch', () => {
    const { list } = renderView({ error: true })

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Could not load your chats.')
    fireEvent.click(screen.getByText('Try again'))
    expect(list.refetch).toHaveBeenCalled()
  })

  it('shows the empty state when there are no items', () => {
    renderView({ items: [], total: 0 })

    expect(screen.getByTestId('archive-empty')).toBeInTheDocument()
  })

  it('shows the list and the count text', () => {
    renderView({ items: [item(1), item(2)], total: 2 })

    expect(screen.getByTestId('archive-list')).toBeInTheDocument()
    expect(screen.getByTestId('archive-count')).toHaveTextContent('2 chats')
  })
})
