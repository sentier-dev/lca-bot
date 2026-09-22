import { describe, it, expect, beforeAll, vi } from 'vitest'
import path from 'node:path'
import { buildIndex } from '@/lib/wiki/build-index'
import { createMockAnthropic } from '@/lib/anthropic/mock'
import { runTurn } from '@/lib/chat/run-turn'
import type { ChatEvent } from '@/lib/chat/events'
import type { WikiIndex } from '@/lib/wiki/types'
import type Anthropic from '@anthropic-ai/sdk'
import type { Message } from '@anthropic-ai/sdk/resources/messages'

const toolUseMessage = (name: string, input: Record<string, unknown>): Message => ({
  id: 'msg_scripted', type: 'message', role: 'assistant', model: 'mock',
  stop_reason: 'tool_use', stop_sequence: null,
  content: [{ type: 'tool_use', id: `toolu_${name}`, name, input, caller: { type: 'direct' } }],
  usage: { input_tokens: 1, output_tokens: 1 },
} as unknown as Message)

const textMessage = (text: string): Message => ({
  id: 'msg_scripted_text', type: 'message', role: 'assistant', model: 'mock',
  stop_reason: 'end_turn', stop_sequence: null,
  content: [{ type: 'text', text, citations: null }],
  usage: { input_tokens: 1, output_tokens: 1 },
} as unknown as Message)

/** A client that replays a fixed list of final messages, one per round. */
function scriptedClient(script: Message[]): Anthropic {
  let round = 0
  return {
    messages: {
      stream: () => {
        const message = script[Math.min(round++, script.length - 1)]
        return {
          async *[Symbol.asyncIterator]() {},
          finalMessage: async () => message,
        }
      },
    },
  } as unknown as Anthropic
}

let index: WikiIndex
beforeAll(async () => {
  index = await buildIndex(path.resolve(__dirname, '../../../fixtures/wiki'), 'abc1234')
})

describe('runTurn', () => {
  it('streams text, runs tools, and returns citations and a trace', async () => {
    const events: ChatEvent[] = []
    const recordGap = vi.fn()
    const result = await runTurn({
      client: createMockAnthropic(),
      model: 'mock',
      index,
      publicBaseUrl: 'https://example/blob',
      history: [{ role: 'user', content: 'What is a functional unit?' }],
      recordGap,
      emit: (e) => events.push(e),
    })
    expect(result.text).toContain('core/concepts/functional-unit.md')
    expect(result.citations).toEqual(['core/concepts/functional-unit.md'])
    expect(result.toolTrace.map((t) => t.name)).toEqual(['search_wiki', 'read_page'])
    expect(result.reportedGap).toBe(false)
    expect(events.filter((e) => e.type === 'tool_start').map((e) => e.type === 'tool_start' && e.name)).toEqual(['search_wiki', 'read_page'])
    expect(events.some((e) => e.type === 'text_delta')).toBe(true)
    expect(recordGap).not.toHaveBeenCalled()
  })

  it('reports a gap and flags the result', async () => {
    const recordGap = vi.fn().mockResolvedValue({ id: 'g' })
    const result = await runTurn({
      client: createMockAnthropic(), model: 'mock', index, publicBaseUrl: 'x',
      history: [{ role: 'user', content: 'Tell me about unknown-topic-xyz' }],
      recordGap, emit: () => {},
    })
    expect(result.reportedGap).toBe(true)
    expect(recordGap).toHaveBeenCalledOnce()
    expect(result.citations).toEqual([])
  })

  it('does not cite a read_page that failed', async () => {
    const client = scriptedClient([
      toolUseMessage('read_page', { path: 'does/not/exist.md' }),
      textMessage('I could not find that page.'),
    ])
    const result = await runTurn({
      client, model: 'mock', index, publicBaseUrl: 'x',
      history: [{ role: 'user', content: 'read a missing page' }],
      recordGap: vi.fn(), emit: () => {},
    })
    expect(result.toolTrace.map((t) => t.name)).toEqual(['read_page'])
    expect(result.citations).toEqual([])
    expect(result.stopReason).toBe('end_turn')
  })

  it('stops after MAX_TOOL_ROUNDS and returns what it has', async () => {
    const looping = createMockAnthropic()
    // Force an endless read_page loop by making every response a tool call.
    const orig = looping.messages.stream.bind(looping.messages)
    looping.messages.stream = ((params: Parameters<typeof orig>[0]) => orig({
      ...params,
      messages: [params.messages[0]],   // always looks like the first turn -> search_wiki forever
    })) as typeof orig
    const events: ChatEvent[] = []
    const result = await runTurn({
      client: looping, model: 'mock', index, publicBaseUrl: 'x',
      history: [{ role: 'user', content: 'loop' }], recordGap: vi.fn(), emit: (e) => events.push(e),
    })
    expect(result.toolTrace.length).toBe(8)
    expect(result.stopReason).toBe('max_tool_rounds')
  })
})
