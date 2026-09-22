import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup, waitFor } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { MessageBubble } from '@/components/chat/message-bubble'
import type { ChatMessage } from '@/types/chat'
import en from '../../../../messages/en.json'

afterEach(cleanup)

const assistant: ChatMessage = {
  id: 'a1',
  role: 'assistant',
  content: '## Answer\n\nThe **functional unit** is the quantified performance.',
  createdAt: '2026-09-22T10:00:00.000Z',
  citations: ['core/concepts/functional-unit.md'],
  toolTrace: [{ name: 'read_page', input: { path: 'core/concepts/functional-unit.md' } }],
  reportedGap: true,
}

describe('MessageBubble', () => {
  it('renders a user turn as plain text, without markdown or metadata', () => {
    const message: ChatMessage = { id: 'u1', role: 'user', content: '**not bold**', createdAt: 'x' }
    renderWithIntl(<MessageBubble message={message} wikiCommit="abc1234" />)

    expect(screen.getByTestId('message-user')).toHaveTextContent('**not bold**')
    expect(screen.getByText(en.chat.bubble.you)).toBeInTheDocument()
    expect(screen.queryByTestId('citations')).toBeNull()
  })

  it('renders an assistant turn as markdown with citations, gap note and trace', async () => {
    renderWithIntl(<MessageBubble message={assistant} wikiCommit="abc1234" />)

    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument())
    expect(screen.getByText('functional unit').tagName).toBe('STRONG')
    expect(screen.getByTestId('citations')).toBeInTheDocument()
    expect(screen.getByTestId('gap-note')).toBeInTheDocument()
    expect(screen.getByTestId('tool-trace')).toBeInTheDocument()
    expect(screen.getByText(en.chat.bubble.assistant)).toBeInTheDocument()
    expect(screen.queryByTestId('streaming-caret')).toBeNull()
  })

  it('hides the metadata while the answer is still streaming, and shows a blinking caret', async () => {
    renderWithIntl(<MessageBubble message={assistant} wikiCommit="abc1234" streaming />)

    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument())
    expect(screen.queryByTestId('citations')).toBeNull()
    expect(screen.queryByTestId('gap-note')).toBeNull()
    expect(screen.queryByTestId('tool-trace')).toBeNull()
    expect(screen.getByTestId('streaming-caret')).toBeInTheDocument()
  })
})
