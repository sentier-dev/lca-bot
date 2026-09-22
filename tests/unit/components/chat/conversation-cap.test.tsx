import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { ConversationCap } from '@/components/chat/conversation-cap'
import en from '../../../../messages/en.json'

afterEach(cleanup)

describe('ConversationCap', () => {
  it('explains the limit and links to a fresh chat', () => {
    renderWithIntl(<ConversationCap />)
    expect(screen.getByText(en.chat.cap.title)).toBeInTheDocument()
    expect(screen.getByText(en.chat.cap.body)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: en.chat.cap.cta })).toHaveAttribute('href', '/chat')
  })
})
