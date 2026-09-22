import { describe, it, expect } from 'vitest'
import { buildSystemBlocks } from '@/lib/anthropic/prompts/wiki-assistant'

// Spelled as an escape so this file stays free of em-dashes itself.
const EM_DASH = '\u2014'

describe('buildSystemBlocks', () => {
  it('returns a cached static block holding the rules and index, plus a dynamic block', () => {
    const blocks = buildSystemBlocks({ indexMarkdown: '# Index\n\n- [x](x.md) - X.', commit: 'abc1234', publicBaseUrl: 'https://github.com/sentier-dev/lca-wiki/blob', today: '2026-09-22' })
    expect(blocks).toHaveLength(2)
    expect(blocks[0].cache_control).toEqual({ type: 'ephemeral' })
    expect(blocks[0].text).toContain('You are LCA Wiki')
    expect(blocks[0].text).toContain('Do not append a list of pages')
    expect(blocks[0].text).not.toMatch(/under a short "Pages used" line/)
    expect(blocks[0].text).toContain('Never fill a gap from memory: an unsourced answer')
    expect(blocks[0].text).toContain('# Index')
    expect(blocks[1].cache_control).toBeUndefined()
    expect(blocks[1].text).toContain('abc1234')
    expect(blocks[1].text).toContain('2026-09-22')
    expect(blocks[1].text).toContain('https://github.com/sentier-dev/lca-wiki/blob/abc1234/')
    expect(blocks[0].text.includes(EM_DASH)).toBe(false)
  })
})
