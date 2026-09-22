import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseVocabulary, findTerm } from '@/lib/wiki/vocabulary'

const raw = readFileSync(path.resolve(__dirname, '../../../fixtures/wiki/vocabulary.md'), 'utf8')

// The real wiki checkout sits next to this repo; the test is skipped without it.
const REAL_VOCABULARY = path.resolve(__dirname, '../../../../..', 'lca-wiki/vocabulary.md')

describe('vocabulary', () => {
  it('splits the file into one entry per ### heading', () => {
    const terms = parseVocabulary(raw)
    expect([...terms.keys()]).toEqual(['activity', 'functional unit', 'system boundary'])
    const fu = terms.get('functional unit')!
    expect(fu.term).toBe('Functional unit')
    expect(fu.section.startsWith('### Functional unit')).toBe(true)
    expect(fu.section).toContain('ILCD (2010)')
    expect(fu.section).toContain('ISO 14044 (2006)')
    expect(fu.section).not.toContain('System boundary')
  })

  it('ignores ### headings inside fenced code blocks', () => {
    const terms = parseVocabulary(
      [
        '### Activity',
        '',
        '- **ILCD (2010)** - a unit process.',
        '',
        '**Entry format.** One `### Term` heading per term:',
        '',
        '```',
        '### Template',
        '',
        '- **Context** - the definition, in one sentence - source: <id>',
        '```',
        '',
        '~~~',
        '### Tilde template',
        '~~~',
        '',
      ].join('\n'),
    )
    expect([...terms.keys()]).toEqual(['activity'])
    expect(terms.has('template')).toBe(false)
    expect(terms.has('tilde template')).toBe(false)
  })

  it.skipIf(!existsSync(REAL_VOCABULARY))('parses the real vocabulary.md into 208 terms', () => {
    const terms = parseVocabulary(readFileSync(REAL_VOCABULARY, 'utf8'))
    expect(terms.size).toBe(208)
    expect(terms.has('term')).toBe(false)
  })

  it('finds a term case-insensitively and suggests neighbours otherwise', () => {
    const terms = parseVocabulary(raw)
    expect(findTerm(terms, 'FUNCTIONAL UNIT').exact?.term).toBe('Functional unit')
    const miss = findTerm(terms, 'functional units')
    expect(miss.exact).toBeNull()
    expect(miss.suggestions[0]).toBe('Functional unit')
    expect(findTerm(terms, 'zzz').suggestions.length).toBeLessThanOrEqual(5)
  })
})
