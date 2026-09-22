import { describe, it, expect } from 'vitest'
import { formatGaps } from '../../../scripts/list-gaps'

describe('formatGaps', () => {
  it('reports an empty result rather than printing nothing', () => {
    expect(formatGaps([])).toEqual(['No gaps recorded.'])
  })

  it('renders one gap as a header line plus the question', () => {
    const lines = formatGaps([{
      created_at: '2026-09-22T08:30:45.000Z',
      email: 'someone@lca.test',
      wiki_commit: 'abcdef1234567890',
      question: 'What is the GWP of beet sugar?',
      note: null,
    }])

    expect(lines).toEqual([
      '2026-09-22 08:30  someone@lca.test  @abcdef1',
      '  Q: What is the GWP of beet sugar?',
    ])
  })

  it('falls back for a deleted user and a missing commit, and includes a note', () => {
    const lines = formatGaps([{
      created_at: '2026-09-22T08:30:45.000Z',
      email: null,
      wiki_commit: null,
      question: 'Where is the dataset?',
      note: 'asked twice',
    }])

    expect(lines).toEqual([
      '2026-09-22 08:30  (deleted user)  @-------',
      '  Q: Where is the dataset?',
      '  note: asked twice',
    ])
  })

  it('keeps the rows in the order given', () => {
    const lines = formatGaps([
      { created_at: '2026-09-22T08:00:00.000Z', email: 'a@lca.test', wiki_commit: 'aaaaaaa', question: 'first', note: null },
      { created_at: '2026-09-21T08:00:00.000Z', email: 'b@lca.test', wiki_commit: 'bbbbbbb', question: 'second', note: null },
    ])

    expect(lines[1]).toBe('  Q: first')
    expect(lines[3]).toBe('  Q: second')
  })
})
