import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, cleanup, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { EmptyState } from '@/components/chat/empty-state'
import en from '../../../../messages/en.json'

afterEach(cleanup)

describe('EmptyState', () => {
  it('shows the brand and the three short pill labels', () => {
    renderWithIntl(<EmptyState onSend={vi.fn()} />)

    expect(screen.getByText(en.chat.empty.wordmark)).toBeInTheDocument()
    expect(screen.getByText(en.chat.empty.body)).toBeInTheDocument()
    expect(screen.getByText(en.chat.empty.chips.e1)).toBeInTheDocument()
    expect(screen.getByText(en.chat.empty.chips.e2)).toBeInTheDocument()
    expect(screen.getByText(en.chat.empty.chips.e3)).toBeInTheDocument()
  })

  it('sends the full example question behind a short pill label', () => {
    const onSend = vi.fn()
    renderWithIntl(<EmptyState onSend={onSend} />)

    fireEvent.click(screen.getByText(en.chat.empty.chips.e2))
    expect(onSend).toHaveBeenCalledWith(en.chat.empty.examples.e2)
  })

  it('renders the message input, autofocused', () => {
    renderWithIntl(<EmptyState onSend={vi.fn()} />)

    expect(screen.getByTestId('chat-input')).toBe(document.activeElement)
  })
})
