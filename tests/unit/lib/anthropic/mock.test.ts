import { describe, it, expect } from 'vitest'
import type { MessageStreamEvent } from '@anthropic-ai/sdk/resources/messages'
import { createMockAnthropic, MOCK_TEXT_PREFIX, MOCK_TITLE } from '@/lib/anthropic/mock'

const tools = [
  { name: 'search_wiki', description: 's', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'read_page', description: 'r', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'lookup_term', description: 'l', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'lookup_source', description: 'o', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'report_gap', description: 'g', input_schema: { type: 'object' as const, properties: {} } },
]

// Typed against the SDK's own event union: the client is an Anthropic, so
// messages.stream() yields MessageStreamEvent and a looser shape does not fit.
async function collectText(stream: AsyncIterable<MessageStreamEvent>) {
  let text = ''
  for await (const ev of stream) {
    if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') text += ev.delta.text
  }
  return text
}

describe('mock anthropic client', () => {
  it('first calls search_wiki with the user question', async () => {
    const client = createMockAnthropic()
    const stream = client.messages.stream({
      model: 'm', max_tokens: 10, tools,
      messages: [{ role: 'user', content: 'What is a functional unit?' }],
    })
    await collectText(stream)
    const final = await stream.finalMessage()
    expect(final.stop_reason).toBe('tool_use')
    const block = final.content.find((b) => b.type === 'tool_use')
    expect(block && block.type === 'tool_use' && block.name).toBe('search_wiki')
    expect(block && block.type === 'tool_use' && (block.input as { query: string }).query).toBe('What is a functional unit?')
  })

  it('after a search result, reads the first hit; after a page, answers citing it', async () => {
    const client = createMockAnthropic()
    const searchResult = JSON.stringify({ hits: [{ path: 'core/concepts/functional-unit.md', title: 'Functional unit' }] })
    const s2 = client.messages.stream({
      model: 'm', max_tokens: 10, tools,
      messages: [
        { role: 'user', content: 'What is a functional unit?' },
        { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'search_wiki', input: { query: 'x' } }] },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: searchResult }] },
      ],
    })
    await collectText(s2)
    const f2 = await s2.finalMessage()
    const read = f2.content.find((b) => b.type === 'tool_use')
    expect(read && read.type === 'tool_use' && read.name).toBe('read_page')
    expect(read && read.type === 'tool_use' && (read.input as { path: string }).path).toBe('core/concepts/functional-unit.md')

    const s3 = client.messages.stream({
      model: 'm', max_tokens: 10, tools,
      messages: [
        { role: 'user', content: 'What is a functional unit?' },
        { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'search_wiki', input: { query: 'x' } }] },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: searchResult }] },
        { role: 'assistant', content: [{ type: 'tool_use', id: 't2', name: 'read_page', input: { path: 'core/concepts/functional-unit.md' } }] },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't2', content: JSON.stringify({ path: 'core/concepts/functional-unit.md', content: '# Functional unit\n\nThe quantified performance.' }) }] },
      ],
    })
    const text = await collectText(s3)
    const f3 = await s3.finalMessage()
    expect(f3.stop_reason).toBe('end_turn')
    expect(text.startsWith(MOCK_TEXT_PREFIX)).toBe(true)
    expect(text).toContain('core/concepts/functional-unit.md')
  })

  it('reports a gap for a question the fixture wiki cannot answer', async () => {
    const client = createMockAnthropic()
    const s = client.messages.stream({
      model: 'm', max_tokens: 10, tools,
      messages: [{ role: 'user', content: 'Tell me about unknown-topic-xyz please' }],
    })
    await collectText(s)
    const f = await s.finalMessage()
    const block = f.content.find((b) => b.type === 'tool_use')
    expect(block && block.type === 'tool_use' && block.name).toBe('report_gap')
  })

  it('reports a gap when the marker arrives mid-thread', async () => {
    const client = createMockAnthropic()
    const s = client.messages.stream({
      model: 'm', max_tokens: 10, tools,
      messages: [
        { role: 'user', content: 'What is a functional unit?' },
        { role: 'assistant', content: 'A functional unit is the quantified performance.' },
        { role: 'user', content: 'And what about unknown-topic-xyz?' },
      ],
    })
    await collectText(s)
    const f = await s.finalMessage()
    const block = f.content.find((b) => b.type === 'tool_use')
    expect(block && block.type === 'tool_use' && block.name).toBe('report_gap')
  })

  it('answers the title tool with a fixed title through create()', async () => {
    const client = createMockAnthropic()
    const msg = await client.messages.create({
      model: 'm', max_tokens: 10,
      tools: [{ name: 'suggest_title', description: 't', input_schema: { type: 'object', properties: {} } }],
      tool_choice: { type: 'tool', name: 'suggest_title' },
      messages: [{ role: 'user', content: 'What is a functional unit?' }],
    })
    const block = msg.content.find((b) => b.type === 'tool_use')
    expect(block && block.type === 'tool_use' && (block.input as { title: string }).title).toBe(MOCK_TITLE)
  })

  it('answers plain text when the caller passes no tools', async () => {
    const client = createMockAnthropic()
    const s = client.messages.stream({
      model: 'm', max_tokens: 10,
      messages: [{ role: 'user', content: 'just chat' }],
    })
    const text = await collectText(s)
    const final = await s.finalMessage()
    expect(final.stop_reason).toBe('end_turn')
    expect(text).toBe(`${MOCK_TEXT_PREFIX} just chat`)
  })

  it('answers with the gap wording after a report_gap result', async () => {
    const client = createMockAnthropic()
    const s = client.messages.stream({
      model: 'm', max_tokens: 10, tools,
      messages: [
        { role: 'user', content: 'Tell me about unknown-topic-xyz' },
        { role: 'assistant', content: [{ type: 'tool_use', id: 'g1', name: 'report_gap', input: { question: 'q' } }] },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'g1', content: JSON.stringify({ recorded: true }) }] },
      ],
    })
    const text = await collectText(s)
    const final = await s.finalMessage()
    expect(final.stop_reason).toBe('end_turn')
    expect(text).toContain('does not cover this yet')
    expect(text).toContain('CONTRIBUTING.md')
  })

  it('only the title tool is forced; other forced tools fall through to the normal decision', async () => {
    const client = createMockAnthropic()
    const msg = await client.messages.create({
      model: 'm', max_tokens: 10, tools,
      tool_choice: { type: 'tool', name: 'read_page' },
      messages: [{ role: 'user', content: 'What is a functional unit?' }],
    })
    const block = msg.content.find((b) => b.type === 'tool_use')
    expect(block && block.type === 'tool_use' && block.name).toBe('search_wiki')
  })
})
