import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { ArchiveRow, displayTitle } from '@/components/archive/archive-row'
import type { ConversationListItem } from '@/hooks/use-conversations'

afterEach(cleanup)

const baseItem: ConversationListItem = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Functional unit basics',
  preview: null,
  messageCount: 4,
  updatedAt: '2026-09-20T10:00:00.000Z',
  createdAt: '2026-09-20T09:00:00.000Z',
}

describe('displayTitle', () => {
  it('prefers the title', () => {
    expect(displayTitle({ title: 'Mine', preview: 'ignored' }, 'Untitled chat')).toBe('Mine')
  })

  it('truncates a long preview to 80 chars with an ellipsis', () => {
    const preview = 'a'.repeat(120)
    const result = displayTitle({ title: null, preview }, 'Untitled chat')
    expect(result).toBe(`${'a'.repeat(80)}…`)
  })

  it('falls back to the untitled string when there is no title or preview', () => {
    expect(displayTitle({ title: null, preview: null }, 'Untitled chat')).toBe('Untitled chat')
  })
})

describe('ArchiveRow', () => {
  it('renders the title link, message count and a date', () => {
    renderWithIntl(<ArchiveRow item={baseItem} onDelete={vi.fn()} onRename={vi.fn()} />)

    const link = screen.getByTestId('archive-open')
    expect(link).toHaveTextContent('Functional unit basics')
    expect(link).toHaveAttribute('href', `/chat/${baseItem.id}`)
    expect(screen.getByText('4 messages')).toBeInTheDocument()
  })

  it('opens the confirm dialog on delete and calls onDelete on confirm', async () => {
    const onDelete = vi.fn().mockResolvedValue(true)
    renderWithIntl(<ArchiveRow item={baseItem} onDelete={onDelete} onRename={vi.fn()} />)

    fireEvent.click(screen.getByTestId('archive-delete'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(baseItem.id))
  })

  it('shows an error when the delete fails', async () => {
    const onDelete = vi.fn().mockResolvedValue(false)
    renderWithIntl(<ArchiveRow item={baseItem} onDelete={onDelete} onRename={vi.fn()} />)

    fireEvent.click(screen.getByTestId('archive-delete'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not delete the chat.'))
  })

  it('opens the rename input, saves on Enter via onRename', async () => {
    const onRename = vi.fn().mockResolvedValue(true)
    renderWithIntl(<ArchiveRow item={baseItem} onDelete={vi.fn()} onRename={onRename} />)

    fireEvent.click(screen.getByTestId('archive-rename'))
    const input = screen.getByTestId('archive-rename-input')
    fireEvent.change(input, { target: { value: 'New title' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(onRename).toHaveBeenCalledWith(baseItem.id, 'New title'))
  })

  it('cancels the rename on Escape without calling onRename', () => {
    const onRename = vi.fn()
    renderWithIntl(<ArchiveRow item={baseItem} onDelete={vi.fn()} onRename={onRename} />)

    fireEvent.click(screen.getByTestId('archive-rename'))
    const input = screen.getByTestId('archive-rename-input')
    fireEvent.change(input, { target: { value: 'Discarded' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByTestId('archive-rename-input')).toBeNull()
    expect(onRename).not.toHaveBeenCalled()
  })

  it('does not call onRename when the draft is emptied', () => {
    const onRename = vi.fn()
    renderWithIntl(<ArchiveRow item={baseItem} onDelete={vi.fn()} onRename={onRename} />)

    fireEvent.click(screen.getByTestId('archive-rename'))
    const input = screen.getByTestId('archive-rename-input')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.submit(input.closest('form')!)

    expect(onRename).not.toHaveBeenCalled()
  })
})
