import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, cleanup, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { MessageInput } from '@/components/chat/message-input'
import { MAX_MESSAGE_CHARS } from '@/types/chat'
import en from '../../../../messages/en.json'

afterEach(cleanup)

function type(value: string) {
  fireEvent.change(screen.getByTestId('chat-input'), { target: { value } })
}

describe('MessageInput', () => {
  it('sends the trimmed draft on Enter and clears the box', () => {
    const onSend = vi.fn()
    renderWithIntl(<MessageInput onSend={onSend} />)
    const input = screen.getByTestId('chat-input') as HTMLTextAreaElement

    expect(input).toHaveAttribute('placeholder', en.chat.input.placeholder)
    type('  What is a functional unit?  ')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSend).toHaveBeenCalledWith('What is a functional unit?')
    expect(input.value).toBe('')
  })

  it('leaves Shift+Enter for a newline', () => {
    const onSend = vi.fn()
    renderWithIntl(<MessageInput onSend={onSend} />)
    type('two lines')
    fireEvent.keyDown(screen.getByTestId('chat-input'), { key: 'Enter', shiftKey: true })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('sends on the send button and refuses an empty box', () => {
    const onSend = vi.fn()
    renderWithIntl(<MessageInput onSend={onSend} />)
    const send = screen.getByTestId('chat-send')

    expect(send).toBeDisabled()
    type('hello')
    fireEvent.click(send)
    expect(onSend).toHaveBeenCalledWith('hello')
  })

  it('sends nothing while disabled', () => {
    const onSend = vi.fn()
    renderWithIntl(<MessageInput onSend={onSend} disabled />)
    type('again')
    fireEvent.keyDown(screen.getByTestId('chat-input'), { key: 'Enter' })
    fireEvent.click(screen.getByTestId('chat-send'))
    expect(onSend).not.toHaveBeenCalled()
  })

  it('shows the counter above 80 percent of the cap and blocks a send over it', () => {
    const onSend = vi.fn()
    renderWithIntl(<MessageInput onSend={onSend} />)
    const input = screen.getByTestId('chat-input')

    type('x'.repeat(100))
    expect(screen.queryByTestId('chat-counter')).toBeNull()

    type('x'.repeat(MAX_MESSAGE_CHARS * 0.9))
    expect(screen.getByTestId('chat-counter')).toHaveTextContent(`${MAX_MESSAGE_CHARS * 0.9}/${MAX_MESSAGE_CHARS}`)

    type('x'.repeat(MAX_MESSAGE_CHARS + 1))
    expect(screen.getByTestId('chat-send')).toBeDisabled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSend).not.toHaveBeenCalled()
  })
})
