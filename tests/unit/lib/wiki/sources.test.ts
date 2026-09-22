import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseSources } from '@/lib/wiki/sources'

const raw = readFileSync(path.resolve(__dirname, '../../../fixtures/wiki/sources.md'), 'utf8')

describe('parseSources', () => {
  it('reads every registry row by id', () => {
    const sources = parseSources(raw)
    expect(sources.size).toBe(4)
    const ilcd = sources.get('ilcd-2010')!
    expect(ilcd.title).toContain('ILCD Handbook')
    expect(ilcd.url).toBe('https://eplca.jrc.ec.europa.eu/ilcd.html')
    expect(ilcd.accessed).toBe('2026-09-21')
    expect(ilcd.licence).toBe('EU reuse policy, attribution')
  })

  it('ignores the header and separator rows and rows outside the registry table', () => {
    const sources = parseSources('| id | title | URL | accessed | licence |\n|---|---|---|---|---|\n| `<standard>-<year>` | a standard | x | y | z |\n\n## Registry\n\n| id | title | URL | accessed | licence |\n|---|---|---|---|---|\n| a-1 | A | https://a | 2026-01-01 | MIT |\n')
    expect([...sources.keys()]).toEqual(['a-1'])
  })
})
