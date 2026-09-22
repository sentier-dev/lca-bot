import { describe, it, expect } from 'vitest'
import { toAnthropicMessages, trimHistory } from '@/lib/chat/history'
import type { ChatMessage } from '@/types/chat'

const msg = (role: 'user' | 'assistant', content: string, i: number): ChatMessage =>
  ({ id: `m${i}`, role, content, createdAt: new Date(i).toISOString() })

describe('history', () => {
  it('maps stored messages to plain text turns and drops metadata', () => {
    const out = toAnthropicMessages([
      { ...msg('user', 'q', 1) },
      { ...msg('assistant', 'a', 2), citations: ['x.md'], toolTrace: [{ name: 'read_page', input: { path: 'x.md' } }] },
    ])
    expect(out).toEqual([{ role: 'user', content: 'q' }, { role: 'assistant', content: 'a' }])
  })

  it('folds consecutive same-role messages into one turn', () => {
    const out = toAnthropicMessages([
      msg('user', 'first try', 1),
      msg('user', 'second try', 2),
      msg('assistant', 'a', 3),
    ])
    expect(out).toEqual([
      { role: 'user', content: 'first try\n\nsecond try' },
      { role: 'assistant', content: 'a' },
    ])
  })

  it('keeps only the last MAX_HISTORY_MESSAGES and always starts with a user turn', () => {
    const many = Array.from({ length: 45 }, (_, i) => msg(i % 2 === 0 ? 'user' : 'assistant', `m${i}`, i))
    const trimmed = trimHistory(many)
    expect(trimmed.length).toBeLessThanOrEqual(40)
    expect(trimmed[0].role).toBe('user')
    expect(trimmed[trimmed.length - 1].content).toBe('m44')
  })
})
