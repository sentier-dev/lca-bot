import { describe, it, expect } from 'vitest'
import { parseLimit } from '../../../scripts/list-gaps'

describe('parseLimit', () => {
  it('defaults to 100 when --limit is absent', () => {
    expect(parseLimit(['node', 'list-gaps.ts'])).toBe(100)
  })

  it('accepts a positive integer', () => {
    expect(parseLimit(['node', 'list-gaps.ts', '--limit', '25'])).toBe(25)
  })

  it.each([['0'], ['-5'], ['abc'], ['1.5'], ['']])('rejects %o', (value) => {
    expect(() => parseLimit(['node', 'list-gaps.ts', '--limit', value])).toThrow(
      '--limit must be a positive integer',
    )
  })

  it('rejects a missing value', () => {
    expect(() => parseLimit(['node', 'list-gaps.ts', '--limit'])).toThrow(
      '--limit must be a positive integer',
    )
  })
})
