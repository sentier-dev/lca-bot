import { describe, it, expect } from 'vitest'
import { parsePage } from '@/lib/wiki/frontmatter'

describe('parsePage', () => {
  it('reads frontmatter fields and strips them from the body', () => {
    const raw = `---\ntitle: Functional unit\ntype: concept\nsummary: "The quantified performance."\naudience: [P1]\nupdated: 2026-09-22\nsources: [ilcd-2010, iso-14044-2006]\n---\n\n# Functional unit\n\nBody text.\n`
    const page = parsePage('core/concepts/functional-unit.md', raw)
    expect(page.title).toBe('Functional unit')
    expect(page.type).toBe('concept')
    expect(page.summary).toBe('The quantified performance.')
    expect(page.updated).toBe('2026-09-22')
    expect(page.sources).toEqual(['ilcd-2010', 'iso-14044-2006'])
    expect(page.branch).toBe('core')
    expect(page.isApi).toBe(false)
    expect(page.body.startsWith('# Functional unit')).toBe(true)
    expect(page.body).not.toContain('title:')
  })

  it('derives title from the first heading and branch root for root files', () => {
    const page = parsePage('index.md', '# Index\n\nEvery page.\n')
    expect(page.title).toBe('Index')
    expect(page.branch).toBe('root')
    expect(page.summary).toBe('')
    expect(page.sources).toEqual([])
  })

  it('falls back to the file name when there is no heading', () => {
    const page = parsePage('brightway/modules/bw2data/api/bw2data.utils.md', 'plain text only')
    expect(page.title).toBe('bw2data.utils')
    expect(page.isApi).toBe(true)
    expect(page.branch).toBe('brightway')
  })

  it('tolerates a date object in updated and non-list sources', () => {
    const page = parsePage('x.md', '---\nupdated: 2026-09-22\nsources: ilcd-2010\n---\n# X\n')
    expect(page.updated).toBe('2026-09-22')
    expect(page.sources).toEqual(['ilcd-2010'])
    const blank = parsePage('y.md', '---\nsources: ""\n---\n# Y\n')
    expect(blank.sources).toEqual([])
    expect(blank.updated).toBe('')
  })

  it('keeps the heading as title when the frontmatter is malformed', () => {
    const page = parsePage('core/concepts/broken.md', '---\ntitle: [unclosed\n---\n# X\n')
    expect(page.title).toBe('X')
    expect(page.branch).toBe('core')
    expect(page.sources).toEqual([])
    expect(page.body).toContain('# X')
  })
})
