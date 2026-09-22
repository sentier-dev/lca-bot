import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { loadPages } from '@/lib/wiki/loader'
import { buildSearch, makeSnippet } from '@/lib/wiki/search'
import type { WikiPage } from '@/lib/wiki/types'

const FIXTURE = path.resolve(__dirname, '../../../fixtures/wiki')

describe('search', () => {
  it('ranks the concept page first for its own title and returns a snippet', async () => {
    const search = buildSearch(await loadPages(FIXTURE))
    const hits = search('functional unit')
    expect(hits[0].path).toBe('core/concepts/functional-unit.md')
    expect(hits[0].snippet.toLowerCase()).toContain('functional unit')
    expect(hits.length).toBeLessThanOrEqual(5)
  })

  it('ranks hand-written pages above generated api pages for the same words', async () => {
    const search = buildSearch(await loadPages(FIXTURE))
    const hits = search('projects set_current')
    const readme = hits.findIndex((h) => h.path === 'brightway/modules/bw2data/README.md')
    const api = hits.findIndex((h) => h.path === 'brightway/modules/bw2data/api/bw2data.md')
    expect(readme).toBeGreaterThanOrEqual(0)
    expect(api).toBeGreaterThanOrEqual(0)
    expect(readme).toBeLessThan(api)
  })

  it('filters by branch and caps the limit at 10', async () => {
    const search = buildSearch(await loadPages(FIXTURE))
    expect(search('unit', { branch: 'brightway' }).every((h) => h.branch === 'brightway')).toBe(true)
    expect(search('a', { limit: 50 }).length).toBeLessThanOrEqual(10)
  })

  it('returns an empty list for gibberish', async () => {
    const search = buildSearch(await loadPages(FIXTURE))
    expect(search('qzxv wprt')).toEqual([])
  })

  it('strips punctuation from the query words so the snippet centres on a match', () => {
    const page: WikiPage = {
      path: 'core/concepts/functional-unit.md',
      title: 'Functional unit',
      summary: 'The reference unit of a product system.',
      type: 'concept',
      updated: '2026-09-22',
      sources: [],
      branch: 'core',
      isApi: false,
      body: `${'x'.repeat(300)} a unit of analysis ${'y'.repeat(300)} functional scope ${'z'.repeat(300)}`,
    }
    const hits = buildSearch([page])('functional unit?')
    expect(hits[0].path).toBe('core/concepts/functional-unit.md')
    expect(hits[0].snippet).toContain('a unit of analysis')
  })

  it('makeSnippet centres on the first matching term', () => {
    const body = 'a'.repeat(300) + ' functional unit ' + 'b'.repeat(300)
    const snippet = makeSnippet(body, ['functional'])
    expect(snippet).toContain('functional unit')
    expect(snippet.length).toBeLessThan(300)
  })
})
