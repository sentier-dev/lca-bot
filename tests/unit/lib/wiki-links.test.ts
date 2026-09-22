import { describe, it, expect } from 'vitest'
import { pageUrl, WIKI_REPO_URL } from '@/lib/wiki-links'

describe('pageUrl', () => {
  it('links to the page at the given commit', () => {
    expect(pageUrl('abc1234', 'core/concepts/functional-unit.md')).toBe(`${WIKI_REPO_URL}/blob/abc1234/core/concepts/functional-unit.md`)
  })
  it('falls back to main when the commit is unknown or missing', () => {
    expect(pageUrl(null, 'index.md')).toBe(`${WIKI_REPO_URL}/blob/main/index.md`)
    expect(pageUrl('unknown', 'index.md')).toBe(`${WIKI_REPO_URL}/blob/main/index.md`)
  })
  it('encodes path segments', () => {
    expect(pageUrl('c', 'a b/c#d.md')).toBe(`${WIKI_REPO_URL}/blob/c/a%20b/c%23d.md`)
  })
})
