import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { CitationChips } from '@/components/chat/citation-chips'
import { pageUrl } from '@/lib/wiki-links'
import en from '../../../../messages/en.json'

afterEach(cleanup)

describe('CitationChips', () => {
  it('renders one link per path, pointing at the page on the answering commit', () => {
    renderWithIntl(<CitationChips citations={['core/README.md', 'core/concepts/functional-unit.md']} commit="abc1234" />)

    expect(screen.getByText(en.chat.citations.label)).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', pageUrl('abc1234', 'core/README.md'))
    expect(links[0]).toHaveAttribute('target', '_blank')
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer')
    expect(links[1]).toHaveAttribute('href', pageUrl('abc1234', 'core/concepts/functional-unit.md'))
  })

  it('falls back to main when the commit is unknown', () => {
    renderWithIntl(<CitationChips citations={['index.md']} commit={null} />)
    expect(screen.getByRole('link', { name: 'index.md' })).toHaveAttribute('href', pageUrl(null, 'index.md'))
  })

  it('renders nothing without citations', () => {
    const { container } = renderWithIntl(<CitationChips citations={[]} commit="abc1234" />)
    expect(container.querySelector('[data-testid="citations"]')).toBeNull()
  })
})
