import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup, waitFor } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { Markdown } from '@/components/ui/markdown'

afterEach(cleanup)

const HOSTILE = [
  '<img src=x onerror=alert(1)>',
  '',
  '[bad](javascript:alert(1))',
  '',
  '[ok](https://example.org)',
  '',
  '<script>alert(1)</script>',
].join('\n')

describe('Markdown sanitising', () => {
  it('drops raw HTML and unsafe hrefs while keeping safe links', async () => {
    const { container } = renderWithIntl(<Markdown content={HOSTILE} />)

    await waitFor(() => expect(screen.getByRole('link', { name: 'ok' })).toBeInTheDocument())

    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.innerHTML).not.toContain('onerror')

    expect(screen.queryByRole('link', { name: 'bad' })).toBeNull()
    const bad = screen.getByText('bad')
    expect(bad.tagName).toBe('SPAN')
    expect(bad).not.toHaveAttribute('href')

    const ok = screen.getByRole('link', { name: 'ok' })
    expect(ok).toHaveAttribute('href', 'https://example.org')
    expect(ok).toHaveAttribute('target', '_blank')
    expect(ok.getAttribute('rel')).toContain('noopener')
  })
})
