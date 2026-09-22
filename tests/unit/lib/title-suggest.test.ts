import { describe, it, expect } from 'vitest'
import { createMockAnthropic, MOCK_TITLE } from '@/lib/anthropic/mock'
import { suggestConversationTitle } from '@/lib/title-suggest'

describe('suggestConversationTitle', () => {
  it('returns the tool title', async () => {
    const title = await suggestConversationTitle({ client: createMockAnthropic(), model: 'm', question: 'What is a functional unit?', answer: 'It is ...' })
    expect(title).toBe(MOCK_TITLE)
  })
  it('returns null on failure or empty', async () => {
    const failing = { messages: { create: async () => { throw new Error('boom') } } } as unknown as import('@anthropic-ai/sdk').default
    expect(await suggestConversationTitle({ client: failing, model: 'm', question: 'q', answer: 'a' })).toBeNull()
  })
})
