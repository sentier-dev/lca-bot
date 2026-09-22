import { describe, it, expect, beforeAll, vi } from 'vitest'
import path from 'node:path'
import { buildIndex } from '@/lib/wiki/build-index'
import { WIKI_TOOLS, executeTool, type ToolContext } from '@/lib/wiki/tools'
import type { WikiIndex } from '@/lib/wiki/types'

let index: WikiIndex
const recordGap = vi.fn().mockResolvedValue({ id: 'gap-1' })
const ctx = (): ToolContext => ({ index, recordGap })

beforeAll(async () => {
  index = await buildIndex(path.resolve(__dirname, '../../../fixtures/wiki'), 'abc1234')
})

describe('WIKI_TOOLS', () => {
  it('declares exactly the five tools with object schemas', () => {
    expect(WIKI_TOOLS.map((t) => t.name)).toEqual(['search_wiki', 'read_page', 'lookup_term', 'lookup_source', 'report_gap'])
    for (const t of WIKI_TOOLS) expect(t.input_schema.type).toBe('object')
  })
})

describe('executeTool', () => {
  it('search_wiki returns hits with path, title, summary, snippet', async () => {
    const out = JSON.parse(await executeTool('search_wiki', { query: 'functional unit' }, ctx()))
    expect(out.hits[0].path).toBe('core/concepts/functional-unit.md')
    expect(out.hits[0]).toHaveProperty('snippet')
  })

  it('search_wiki rejects an unknown branch and an empty query as tool errors, not exceptions', async () => {
    expect(JSON.parse(await executeTool('search_wiki', { query: 'x', branch: 'nope' }, ctx()))).toHaveProperty('error')
    expect(JSON.parse(await executeTool('search_wiki', { query: '   ' }, ctx()))).toHaveProperty('error')
  })

  it('read_page returns the page in windows with hasMore and nextOffset', async () => {
    const out = JSON.parse(await executeTool('read_page', { path: 'core/concepts/functional-unit.md' }, ctx()))
    expect(out.path).toBe('core/concepts/functional-unit.md')
    expect(out.content).toContain('reference unit')
    expect(out.hasMore).toBe(false)
    expect(out.frontmatter.sources).toEqual(['ilcd-2010', 'iso-14044-2006'])
  })

  it('read_page windows a long body', async () => {
    const long = { ...index.pages.get('core/README.md')!, body: 'x'.repeat(30_000) }
    const big: WikiIndex = { ...index, pages: new Map(index.pages).set('core/README.md', long) }
    const first = JSON.parse(await executeTool('read_page', { path: 'core/README.md' }, { index: big, recordGap }))
    expect(first.content).toHaveLength(24_000)
    expect(first.hasMore).toBe(true)
    expect(first.nextOffset).toBe(24_000)
    const second = JSON.parse(await executeTool('read_page', { path: 'core/README.md', offset: 24_000 }, { index: big, recordGap }))
    expect(second.content).toHaveLength(6_000)
    expect(second.hasMore).toBe(false)
  })

  it('read_page on an unknown path suggests close paths and never touches the filesystem', async () => {
    const out = JSON.parse(await executeTool('read_page', { path: '../../etc/passwd' }, ctx()))
    expect(out.error).toBe('not found')
    const out2 = JSON.parse(await executeTool('read_page', { path: 'core/concepts/functional-units.md' }, ctx()))
    expect(out2.suggestions).toContain('core/concepts/functional-unit.md')
  })

  it('lookup_term returns the section or suggestions', async () => {
    const hit = JSON.parse(await executeTool('lookup_term', { term: 'Functional Unit' }, ctx()))
    expect(hit.term).toBe('Functional unit')
    expect(hit.section).toContain('ILCD (2010)')
    const miss = JSON.parse(await executeTool('lookup_term', { term: 'functional units' }, ctx()))
    expect(miss.error).toBe('not found')
    expect(miss.suggestions[0]).toBe('Functional unit')
  })

  it('lookup_source returns the registry row', async () => {
    const out = JSON.parse(await executeTool('lookup_source', { id: 'ilcd-2010' }, ctx()))
    expect(out.url).toContain('eplca')
    expect(JSON.parse(await executeTool('lookup_source', { id: 'nope' }, ctx())).error).toBe('not found')
  })

  it('report_gap records the question through the context', async () => {
    const out = JSON.parse(await executeTool('report_gap', { question: 'What about X?', note: 'n' }, ctx()))
    expect(out.recorded).toBe(true)
    expect(recordGap).toHaveBeenCalledWith({ question: 'What about X?', note: 'n' })
  })

  it('report_gap reports a storage failure instead of throwing', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('db down'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const out = JSON.parse(await executeTool('report_gap', { question: 'What about X?' }, { index, recordGap: failing }))
    expect(out.error).toBe('could not record the gap; tell the user anyway')
    expect(out.recorded).toBeUndefined()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('coerces numeric arguments given as strings and rejects unreadable ones', async () => {
    const long = { ...index.pages.get('core/README.md')!, body: 'x'.repeat(30_000) }
    const big: WikiIndex = { ...index, pages: new Map(index.pages).set('core/README.md', long) }
    const ok = JSON.parse(await executeTool('read_page', { path: 'core/README.md', offset: '24000' }, { index: big, recordGap }))
    expect(ok.offset).toBe(24_000)
    expect(ok.content).toHaveLength(6_000)
    const bad = JSON.parse(await executeTool('read_page', { path: 'core/README.md', offset: 'abc' }, { index: big, recordGap }))
    expect(bad.error).toBe('offset must be a non-negative integer')
    const negative = JSON.parse(await executeTool('read_page', { path: 'core/README.md', offset: -1 }, { index: big, recordGap }))
    expect(negative.error).toBe('offset must be a non-negative integer')
  })

  it('search_wiki coerces a string limit and rejects an unreadable one or a non-string branch', async () => {
    const limited = JSON.parse(await executeTool('search_wiki', { query: 'functional unit', limit: '1' }, ctx()))
    expect(limited.hits).toHaveLength(1)
    expect(JSON.parse(await executeTool('search_wiki', { query: 'x', limit: 'many' }, ctx())).error)
      .toBe('limit must be an integer between 1 and 10')
    expect(JSON.parse(await executeTool('search_wiki', { query: 'x', branch: 7 }, ctx())).error).toMatch(/unknown branch/)
  })

  it('unknown tool names and malformed input are tool errors', async () => {
    expect(JSON.parse(await executeTool('nope', {}, ctx())).error).toMatch(/unknown tool/)
    expect(JSON.parse(await executeTool('read_page', {}, ctx())).error).toMatch(/path/)
  })
})
