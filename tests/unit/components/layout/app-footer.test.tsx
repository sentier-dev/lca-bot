import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import en from '../../../../messages/en.json'

// AppFooter is an async server component: next-intl/server's getTranslations
// needs a request scope that does not exist under vitest, so the English
// catalog is served directly.
vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => {
    const dict = (en as unknown as Record<string, Record<string, string>>)[namespace]
    return (key: string) => dict[key]
  },
}))

import { AppFooter } from '@/components/layout/app-footer'
import { WIKI_REPO_URL, pageUrl } from '@/lib/wiki-links'
import { wikiStore } from '@/lib/wiki/store'
import type { WikiIndex } from '@/lib/wiki/types'

afterEach(() => {
  cleanup()
  wikiStore.resetForTests()
})

describe('AppFooter', () => {
  it('names the wiki repo and links to it in a new tab', async () => {
    render(await AppFooter())

    const link = screen.getByRole('link', { name: 'sentier-dev/lca-wiki' })
    expect(link).toHaveAttribute('href', WIKI_REPO_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders the footer strings from the catalog', async () => {
    const { container } = render(await AppFooter())

    expect(screen.getByText(en.footer.answersFrom)).toBeInTheDocument()
    expect(screen.getByText(en.footer.project)).toBeInTheDocument()
    expect(container.querySelector('footer')).not.toBeNull()
  })

  it('shows the loaded commit, its page link and the sync time', async () => {
    wikiStore.set({ commit: 'abcdef1234567890', pages: new Map() } as unknown as WikiIndex)
    const { container } = render(await AppFooter())

    const commitLink = screen.getByRole('link', { name: 'abcdef1' })
    expect(commitLink).toHaveAttribute('href', pageUrl('abcdef1234567890', 'index.md'))
    const text = container.textContent ?? ''
    expect(text).toContain(`${en.footer.commit} abcdef1`)
    expect(text).toMatch(new RegExp(`${en.footer.synced} \\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2} UTC`))
  })

  it('says the index is still loading when no commit is known', async () => {
    const { container } = render(await AppFooter())

    expect(container.textContent).toContain(`(${en.footer.loading})`)
    expect(screen.queryByRole('link', { name: /^[0-9a-f]{7}$/ })).toBeNull()
  })

  it('hides the decorative separator from assistive tech', async () => {
    const { container } = render(await AppFooter())

    const separator = container.querySelector('span[aria-hidden="true"]')
    expect(separator).not.toBeNull()
    expect(separator?.textContent).toBe('·')
  })
})
