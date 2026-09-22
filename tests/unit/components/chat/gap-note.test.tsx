import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { GapNote } from '@/components/chat/gap-note'
import en from '../../../../messages/en.json'

afterEach(cleanup)

describe('GapNote', () => {
  it('states that the question was recorded, as a note landmark', () => {
    renderWithIntl(<GapNote />)
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent(en.chat.gap.note)
  })
})
