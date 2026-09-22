import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { TypingIndicator } from '@/components/chat/typing-indicator'
import en from '../../../../messages/en.json'

afterEach(cleanup)

describe('TypingIndicator', () => {
  it('shows the current tool step when there is one', () => {
    renderWithIntl(<TypingIndicator step="Reading core/README.md" />)
    expect(screen.getByTestId('typing-indicator')).toHaveTextContent('Reading core/README.md')
  })

  it('falls back to the generic working line', () => {
    renderWithIntl(<TypingIndicator step={null} />)
    expect(screen.getByText(en.chat.working)).toBeInTheDocument()
  })
})
