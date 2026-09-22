import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import type { ChatMessage } from '@/types/chat'
import en from '../../../../messages/en.json'

const { hook } = vi.hoisted(() => ({ hook: { current: null as unknown } }))
vi.mock('@/hooks/use-chat', () => ({ useChat: () => hook.current }))

import { ChatView } from '@/components/chat/chat-view'

type ChatState = ReturnType<typeof baseChat>

function baseChat() {
  return {
    messages: [] as ChatMessage[],
    status: 'idle' as 'idle' | 'streaming' | 'error',
    errorCode: null as string | null,
    currentStep: null as string | null,
    streamingText: '',
    wikiCommit: 'abc1234' as string | null,
    lastFailedMessage: null as string | null,
    conversationId: null as string | null,
    send: vi.fn(),
    retry: vi.fn(),
    stop: vi.fn(),
  }
}

function renderView(overrides: Partial<ChatState> = {}, initialTitle: string | null = null) {
  const chat = { ...baseChat(), ...overrides }
  hook.current = chat
  return { chat, ...renderWithIntl(<ChatView conversationId={null} initialMessages={[]} initialWikiCommit="abc1234" initialTitle={initialTitle} />) }
}

const message = (id: string, role: 'user' | 'assistant', content: string): ChatMessage =>
  ({ id, role, content, createdAt: '2026-09-22T10:00:00.000Z' })

afterEach(cleanup)

describe('ChatView', () => {
  it('renders the landing layout with a single input and no chat-empty once messages exist', () => {
    const { chat } = renderView()

    expect(screen.getByTestId('chat-empty')).toBeInTheDocument()
    expect(screen.getAllByTestId('chat-input')).toHaveLength(1)
    fireEvent.click(screen.getByText(en.chat.empty.chips.e1))
    expect(chat.send).toHaveBeenCalledWith(en.chat.empty.examples.e1)
  })

  it('renders the normal chat layout once there are messages', () => {
    renderView({ messages: [message('u1', 'user', 'q'), message('a1', 'assistant', 'a')] })

    expect(screen.queryByTestId('chat-empty')).toBeNull()
    expect(screen.getByTestId('chat-input')).toBeInTheDocument()
  })

  it('shows the typing indicator with the current step while no text has arrived', () => {
    renderView({ status: 'streaming', currentStep: 'Reading core/README.md', messages: [message('u1', 'user', 'q')] })

    expect(screen.getByTestId('typing-indicator')).toHaveTextContent('Reading core/README.md')
    expect(screen.queryByTestId('chat-empty')).toBeNull()
  })

  it('renders the partial answer as a streaming bubble instead of the indicator', async () => {
    renderView({ status: 'streaming', streamingText: 'Partial answer', messages: [message('u1', 'user', 'q')] })

    await waitFor(() => expect(screen.getByText('Partial answer')).toBeInTheDocument())
    expect(screen.queryByTestId('typing-indicator')).toBeNull()
    expect(screen.getByTestId('chat-input')).toBeDisabled()
    expect(screen.getByTestId('streaming-caret')).toBeInTheDocument()
  })

  it('shows the error with a retry button', () => {
    const { chat } = renderView({ status: 'error', errorCode: 'wiki_unavailable', lastFailedMessage: 'q', messages: [message('u1', 'user', 'q')] })

    expect(screen.getByRole('alert')).toHaveTextContent(en.chat.errors.wiki_unavailable)
    fireEvent.click(screen.getByRole('button', { name: en.chat.errors.retry }))
    expect(chat.retry).toHaveBeenCalled()
  })

  it('maps the codes without their own string onto the generic failure', () => {
    renderView({ status: 'error', errorCode: 'conversation_full', messages: [message('u1', 'user', 'q')] })

    expect(screen.getByRole('alert')).toHaveTextContent(en.chat.errors.turn_failed)
    expect(screen.queryByRole('button', { name: en.chat.errors.retry })).toBeNull()
  })

  it('shows the session-expired message for an unauthorized error', () => {
    renderView({ status: 'error', errorCode: 'unauthorized', messages: [message('u1', 'user', 'q')] })

    expect(screen.getByRole('alert')).toHaveTextContent(en.chat.errors.unauthorized)
  })

  it('replaces the input with the cap notice once the conversation is full', () => {
    renderView({ messages: Array.from({ length: 40 }, (_, i) => message(`m${i}`, i % 2 === 0 ? 'user' : 'assistant', `m${i}`)) })

    expect(screen.getByTestId('conversation-cap')).toBeInTheDocument()
    expect(screen.queryByTestId('chat-input')).toBeNull()
  })

  it('shows the title on a resumed chat', () => {
    renderView({ messages: [message('u1', 'user', 'q')] }, 'Functional unit basics')

    expect(screen.getByTestId('chat-title')).toHaveTextContent('Functional unit basics')
  })

  it('renders no title when none is set', () => {
    renderView({ messages: [message('u1', 'user', 'q')] }, null)

    expect(screen.queryByTestId('chat-title')).toBeNull()
  })
})
