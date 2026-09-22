import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { buildIndex } from '@/lib/wiki/build-index'

const FIXTURE = path.resolve(__dirname, '../../../fixtures/wiki')

describe('buildIndex', () => {
  it('assembles pages, terms, sources, search and the index markdown', async () => {
    const index = await buildIndex(FIXTURE, 'abc1234')
    expect(index.commit).toBe('abc1234')
    expect(index.pages.size).toBe(13)
    expect(index.terms.size).toBe(3)
    expect(index.sources.size).toBe(4)
    expect(index.indexMarkdown.startsWith('# Index')).toBe(true)
    expect(index.search('screening')[0].path).toBe('core/use-cases/screening-lca.md')
    expect(Date.parse(index.builtAt)).not.toBeNaN()
  })

  it('throws a clear error when index.md is missing', async () => {
    await expect(buildIndex(path.resolve(__dirname), 'x')).rejects.toThrow(/index\.md/)
  })
})
